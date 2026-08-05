import { GoogleGenAI } from "@google/genai";
import { env } from "./env.js";
import { HttpError } from "./http-error.js";

let client: GoogleGenAI | null = null;

/**
 * Lazily construct the Gemini client so the server can still boot (and serve
 * every non-AI route) when no key is configured.
 */
export function getGemini(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(
      503,
      "AI_NOT_CONFIGURED",
      "Fitur AI belum aktif. GEMINI_API_KEY belum diset di server.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

export const isGeminiConfigured = () => Boolean(env.GEMINI_API_KEY);

export const GEMINI_MODEL = env.GEMINI_MODEL;
