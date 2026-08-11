import { Type } from "@google/genai";
import { GEMINI_MODEL, getGemini } from "../../lib/gemini.js";
import { HttpError } from "../../lib/http-error.js";

export interface ImageInput {
  mimeType: string;
  base64: string;
}

/**
 * What the photo actually shows. Colour analysis stays useful on a macro shot
 * of a single area (a user zooming into their cheek), so those are accepted
 * too — only genuinely unrelated images are rejected.
 */
export type VisionSubject = "face" | "skin_closeup" | "other";

export interface NormalisedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The vision call's ONLY job now is framing: is this a usable photo, and
 * where in it is a clean, representative patch of bare skin? It is
 * deliberately NOT asked to judge skin condition, type, or colour — those
 * either come from the user's own survey answers (condition, type — see the
 * quiz module) or are MEASURED from the located patch's actual pixels (see
 * scan.pixels.ts + scan.colour.ts), not guessed from a photo by an LLM.
 */
export interface SkinVision {
  subject: VisionSubject;
  imageQuality: "good" | "fair" | "poor";
  notes: string;
  /** Normalised (0-1) box over bare skin, clear of hair/eyes/lips/makeup/shadow. */
  skinPatch: NormalisedBox | null;
}

const SYSTEM_INSTRUCTION = [
  "Kamu adalah asisten framing foto untuk analisis warna kulit KOSMETIK,",
  "bukan diagnosis medis. Jangan menilai kondisi kulit, tipe kulit, atau",
  "warna apa pun — tugasmu murni menentukan apakah foto ini bisa dipakai dan",
  "di mana letak area kulit polos yang bersih untuk diukur warnanya.",
  "Isi field subject dengan: 'face' jika terlihat wajah manusia,",
  "'skin_closeup' jika foto makro kulit manusia tanpa wajah utuh,",
  "atau 'other' jika gambar bukan kulit manusia sama sekali.",
  "Jika subject='other', jangan mengarang skinPatch apa pun — isi null.",
  "Tulis field notes dalam Bahasa Indonesia yang ramah, maksimal 2 kalimat,",
  "tanpa menyebut kondisi atau warna kulit.",
].join(" ");

const PROMPT = [
  "Lihat foto ini dan tentukan:",
  "1. subject: apa yang terlihat (lihat definisi di instruksi sistem).",
  "2. imageQuality: kualitas foto untuk pengukuran warna (pencahayaan, fokus).",
  "3. notes: ringkasan singkat dan ramah tentang foto ini (BUKAN kondisi kulit).",
  "4. skinPatch: kotak normalisasi (0-1) di sekitar sepetak kulit POLOS yang",
  "   representatif dan mudah diukur warnanya — idealnya area pipi.",
  "   Hindari mata, bibir, alis, rambut, bayangan keras, pantulan cahaya",
  "   terang (specular highlight), dan area yang tertutup makeup tebal.",
  "   Kotak boleh kecil (misal 15-25% lebar/tinggi foto) selama isinya benar-",
  "   benar kulit polos. Jika tidak ada wajah/kulit yang jelas, isi null.",
].join("\n");

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
      description: "kualitas foto untuk pengukuran warna (pencahayaan, fokus, sudut)",
    },
    notes: {
      type: Type.STRING,
      description: "ringkasan singkat dan ramah tentang foto, bukan kondisi kulit",
    },
    skinPatch: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        x: { type: Type.NUMBER, description: "sisi kiri kotak, 0-1" },
        y: { type: Type.NUMBER, description: "sisi atas kotak, 0-1" },
        width: { type: Type.NUMBER, description: "lebar kotak, 0-1" },
        height: { type: Type.NUMBER, description: "tinggi kotak, 0-1" },
      },
      required: ["x", "y", "width", "height"],
    },
  },
  required: ["subject", "imageQuality", "notes", "skinPatch"],
};

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
