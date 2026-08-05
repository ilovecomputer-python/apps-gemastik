import { Type } from "@google/genai";
import { GEMINI_MODEL, getGemini } from "../../lib/gemini.js";
import { HttpError } from "../../lib/http-error.js";
import {
  DEPTHS,
  FACE_SHAPES,
  SKIN_CONCERNS,
  SKIN_TYPES,
  UNDERTONES,
} from "./scan.taxonomy.js";

export interface ImageInput {
  mimeType: string;
  base64: string;
}

/**
 * What the photo actually shows. Skin analysis stays useful on a macro shot of
 * a single area (a user zooming into their nose), so those are accepted too —
 * only genuinely unrelated images are rejected.
 */
export type VisionSubject = "face" | "skin_closeup" | "other";

interface BaseVision {
  subject: VisionSubject;
  imageQuality: "good" | "fair" | "poor";
  notes: string;
}

export interface SkinVision extends BaseVision {
  skinType: (typeof SKIN_TYPES)[number];
  conditions: Record<(typeof SKIN_CONCERNS)[number], number>;
}

export interface ShadeVision extends BaseVision {
  undertone: (typeof UNDERTONES)[number];
  depth: (typeof DEPTHS)[number];
}

export interface FaceShapeVision extends BaseVision {
  faceShape: (typeof FACE_SHAPES)[number];
}

const SYSTEM_INSTRUCTION = [
  "Kamu adalah asisten analisis kecantikan untuk marketplace skincare Indonesia.",
  "Tugasmu menilai tampilan kulit wajah secara KOSMETIK, bukan diagnosis medis.",
  "Jangan pernah menyebut nama penyakit, jangan memberi saran pengobatan medis.",
  "Isi field subject dengan: 'face' jika terlihat wajah manusia,",
  "'skin_closeup' jika foto makro kulit manusia tanpa wajah utuh,",
  "atau 'other' jika gambar bukan kulit manusia sama sekali.",
  "Jika subject='other', jangan mengarang penilaian apa pun.",
  "Tulis field notes dalam Bahasa Indonesia yang ramah, maksimal 2 kalimat.",
].join(" ");

const BASE_PROPS = {
  subject: {
    type: Type.STRING,
    enum: ["face", "skin_closeup", "other"],
    description: "apa yang terlihat pada foto",
  },
  imageQuality: {
    type: Type.STRING,
    enum: ["good", "fair", "poor"],
    description: "kualitas foto untuk analisis (pencahayaan, fokus, sudut)",
  },
  notes: {
    type: Type.STRING,
    description: "ringkasan singkat kondisi dalam Bahasa Indonesia",
  },
} as const;

const MAX_ATTEMPTS = 3;
/** Cap a single vision call so a stalled upstream can't hang the request. */
const ATTEMPT_TIMEOUT_MS = 25_000;

/**
 * Daily/per-minute quota exhaustion. Retrying in-request is pointless here —
 * Gemini asks for a wait measured in tens of seconds — so fail fast and tell
 * the user plainly.
 */
function isQuotaExceeded(message: string): boolean {
  return /RESOURCE_EXHAUSTED|exceeded your current quota|quota/i.test(message);
}

/** Server-side overload or a stalled call: short backoff genuinely helps. */
function isTransient(message: string): boolean {
  return (
    !isQuotaExceeded(message) &&
    /\b(500|502|503|504)\b|UNAVAILABLE|high demand|overloaded|aborted|timeout|TimeoutError/i.test(
      message,
    )
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callVision<T>(
  image: ImageInput,
  prompt: string,
  responseSchema: Record<string, unknown>,
): Promise<T> {
  const ai = getGemini();

  let response;
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: image.mimeType, data: image.base64 } },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          // Keep output stable: the same photo should not swing between scans.
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      });
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      const retryable = isTransient(lastError) && attempt < MAX_ATTEMPTS;
      console.error(
        `Gemini request failed (attempt ${attempt}/${MAX_ATTEMPTS}${retryable ? ", retrying" : ""}):`,
        lastError,
      );
      if (!retryable) break;
      await delay(500 * 2 ** (attempt - 1));
    }
  }

  if (!response) {
    if (isQuotaExceeded(lastError)) {
      throw new HttpError(
        429,
        "AI_QUOTA_EXCEEDED",
        "Kuota analisa AI hari ini sudah habis. Coba lagi nanti.",
      );
    }
    throw new HttpError(
      502,
      "AI_REQUEST_FAILED",
      isTransient(lastError)
        ? "Layanan AI sedang sibuk. Coba lagi sebentar lagi."
        : "Analisis AI sedang tidak tersedia. Coba lagi sebentar lagi.",
    );
  }

  const text = response.text;
  if (!text) {
    throw new HttpError(
      502,
      "AI_EMPTY_RESPONSE",
      "AI tidak mengembalikan hasil. Coba foto lain.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("Gemini returned non-JSON output:", text.slice(0, 300));
    throw new HttpError(
      502,
      "AI_BAD_RESPONSE",
      "Hasil AI tidak terbaca. Coba lagi.",
    );
  }
}

export async function analyseSkin(image: ImageInput): Promise<SkinVision> {
  const conditionProps = Object.fromEntries(
    SKIN_CONCERNS.map((concern) => [
      concern,
      {
        type: Type.INTEGER,
        description: `tingkat keparahan ${concern} pada skala 0-100`,
      },
    ]),
  );

  return callVision<SkinVision>(
    image,
    [
      "Analisis kondisi kulit wajah pada foto ini.",
      "Beri skor 0-100 untuk setiap kondisi berikut berdasarkan seberapa terlihat pada wajah:",
      "- acne: jerawat aktif, bruntusan, kemerahan meradang",
      "- blackheads: komedo hitam/putih, terutama area hidung dan dagu",
      "- dark_spots: noda hitam, bekas jerawat, hiperpigmentasi tidak merata",
      "- pores: pori-pori yang terlihat membesar",
      "- wrinkles: garis halus dan kerutan",
      "Skor 0 berarti tidak terlihat sama sekali, 100 berarti sangat dominan.",
      "Tentukan juga tipe kulit dari tampilan minyak dan teksturnya.",
    ].join("\n"),
    {
      type: Type.OBJECT,
      properties: {
        ...BASE_PROPS,
        skinType: { type: Type.STRING, enum: [...SKIN_TYPES] },
        conditions: {
          type: Type.OBJECT,
          properties: conditionProps,
          required: [...SKIN_CONCERNS],
        },
      },
      required: ["subject", "imageQuality", "notes", "skinType", "conditions"],
    },
  );
}

export async function analyseShade(image: ImageInput): Promise<ShadeVision> {
  return callVision<ShadeVision>(
    image,
    [
      "Analisis warna kulit wajah pada foto ini untuk mencocokkan shade makeup.",
      "Tentukan undertone (warm = dasar kuning/keemasan, cool = dasar pink/kebiruan,",
      "neutral = campuran keduanya) dan kedalaman warna kulit.",
      "Perhatikan area pipi dan rahang, abaikan pengaruh makeup jika terlihat.",
    ].join("\n"),
    {
      type: Type.OBJECT,
      properties: {
        ...BASE_PROPS,
        undertone: { type: Type.STRING, enum: [...UNDERTONES] },
        depth: { type: Type.STRING, enum: [...DEPTHS] },
      },
      required: ["subject", "imageQuality", "notes", "undertone", "depth"],
    },
  );
}

export async function analyseFaceShape(
  image: ImageInput,
): Promise<FaceShapeVision> {
  return callVision<FaceShapeVision>(
    image,
    [
      "Analisis bentuk wajah pada foto ini.",
      "Perhatikan perbandingan lebar dahi, tulang pipi, rahang, dan panjang wajah.",
      "Pilih satu bentuk yang paling mendekati.",
    ].join("\n"),
    {
      type: Type.OBJECT,
      properties: {
        ...BASE_PROPS,
        faceShape: { type: Type.STRING, enum: [...FACE_SHAPES] },
      },
      required: ["subject", "imageQuality", "notes", "faceShape"],
    },
  );
}
