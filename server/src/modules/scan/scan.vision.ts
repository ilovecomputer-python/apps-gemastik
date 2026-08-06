import { Type } from "@google/genai";
import { GEMINI_MODEL, getGemini } from "../../lib/gemini.js";
import { HttpError } from "../../lib/http-error.js";
import { SKIN_CONCERNS, SKIN_TYPES } from "./scan.taxonomy.js";
import {
  CHROMAS,
  HUES,
  VALUES,
  type Chroma,
  type Hue,
  type Value,
} from "./scan.colour.js";

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

/**
 * One vision call covers everything the app needs about a face: the five
 * dataset conditions, the skin type, and the undertone used for shade
 * matching. Splitting these into separate calls would triple both the latency
 * and the API quota for no extra signal.
 */
export interface SkinVision {
  subject: VisionSubject;
  imageQuality: "good" | "fair" | "poor";
  notes: string;
  skinType: (typeof SKIN_TYPES)[number];
  conditions: Record<(typeof SKIN_CONCERNS)[number], number>;
  /**
   * Perceptual axes for personal colour. The model rates these; the season is
   * derived from them in scan.colour.ts, so the classification stays
   * auditable. `hue` doubles as the undertone used for shade matching.
   */
  hue: Hue;
  value: Value;
  chroma: Chroma;
  /** Fitzpatrick phototype I-VI, carried as 1-6. */
  fitzpatrick: number;
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

const PROMPT = [
  "Analisis kondisi kulit wajah pada foto ini.",
  "Beri skor 0-100 untuk setiap kondisi berikut berdasarkan seberapa terlihat pada wajah:",
  "- acne: jerawat aktif, bruntusan, kemerahan meradang",
  "- blackheads: komedo hitam/putih, terutama area hidung dan dagu",
  "- dark_spots: noda hitam, bekas jerawat, hiperpigmentasi tidak merata",
  "- pores: pori-pori yang terlihat membesar",
  "- wrinkles: garis halus dan kerutan",
  "Skor 0 berarti tidak terlihat sama sekali, 100 berarti sangat dominan.",
  "Tentukan juga tipe kulit dari tampilan minyak dan teksturnya.",
  "",
  "Lalu nilai empat atribut warna berikut. JANGAN menyebut nama musim apa pun —",
  "cukup nilai apa yang terlihat, penentuan musim dilakukan di sistem kami.",
  "- hue: dasar warna kulit. warm = kuning/keemasan/peach,",
  "  cool = pink/kebiruan/kemerahan, neutral = campuran keduanya.",
  "  Perhatikan area pipi dan rahang, abaikan pengaruh makeup.",
  "- value: terang-gelapnya keseluruhan penampilan (kulit, rambut, alis, mata).",
  "  light = didominasi terang, deep = didominasi gelap.",
  "- chroma: pekat atau lembutnya warna alami serta kontras antar fitur.",
  "  soft = berdebu/menyatu/kontras rendah, clear = jernih/pekat/kontras tinggi.",
  "- fitzpatrick: fototipe kulit skala 1-6 (1 sangat terang dan mudah terbakar",
  "  matahari, 6 sangat gelap dan jarang terbakar).",
  "Jika foto hanya makro kulit tanpa wajah utuh, nilai atribut warna sebaik",
  "mungkin dari warna kulit yang terlihat.",
].join("\n");

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

export async function analyseSkin(image: ImageInput): Promise<SkinVision> {
  const ai = getGemini();

  const conditionProps = Object.fromEntries(
    SKIN_CONCERNS.map((concern) => [
      concern,
      {
        type: Type.INTEGER,
        description: `tingkat keparahan ${concern} pada skala 0-100`,
      },
    ]),
  );

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
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
      skinType: { type: Type.STRING, enum: [...SKIN_TYPES] },
      hue: { type: Type.STRING, enum: [...HUES] },
      value: { type: Type.STRING, enum: [...VALUES] },
      chroma: { type: Type.STRING, enum: [...CHROMAS] },
      fitzpatrick: {
        type: Type.INTEGER,
        description: "fototipe kulit Fitzpatrick, 1 sampai 6",
      },
      conditions: {
        type: Type.OBJECT,
        properties: conditionProps,
        required: [...SKIN_CONCERNS],
      },
    },
    required: [
      "subject",
      "imageQuality",
      "notes",
      "skinType",
      "hue",
      "value",
      "chroma",
      "fitzpatrick",
      "conditions",
    ],
  };

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
              { text: PROMPT },
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
    return JSON.parse(text) as SkinVision;
  } catch {
    console.error("Gemini returned non-JSON output:", text.slice(0, 300));
    throw new HttpError(
      502,
      "AI_BAD_RESPONSE",
      "Hasil AI tidak terbaca. Coba lagi.",
    );
  }
}
