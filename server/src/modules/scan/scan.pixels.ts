import { Jimp } from "jimp";
import { HttpError } from "../../lib/http-error.js";
import type { RGB } from "./scan.colour.js";

/** Normalised (0-1) bounding box, as returned by the vision call. */
export interface NormalisedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fallback when the vision call didn't return a usable box (missing, or a
 * degenerate/out-of-range one). Centre-weighted, biased toward where a cheek
 * sits in a front-facing selfie: below the eyeline, above the chin/neck.
 */
const FALLBACK_BOX: NormalisedBox = { x: 0.3, y: 0.4, width: 0.4, height: 0.25 };

const MIN_SAMPLE_PIXELS = 16;
/** Trim this fraction of pixels off each end of the luminance distribution
 * before averaging, so one small specular highlight or shadow sliver inside
 * the crop can't skew the reading. A standard trimmed-mean, not a full
 * statistical pipeline — proportionate to what a single skin patch needs. */
const TRIM_FRACTION = 0.1;

function isUsableBox(box: NormalisedBox | undefined | null): box is NormalisedBox {
  if (!box) return false;
  const { x, y, width, height } = box;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0.02 &&
    height > 0.02 &&
    x >= 0 &&
    y >= 0 &&
    x + width <= 1.001 &&
    y + height <= 1.001
  );
}

/**
 * Decode the same base64 photo already sent to Gemini, crop to the skin
 * patch it located, and return the trimmed-mean pixel colour of that crop.
 *
 * This is independent of the vision call's judgement — Gemini only located
 * WHERE the patch is; every colour number from here on is read straight off
 * the image's own pixels.
 */
export async function sampleSkinColour(
  base64: string,
  box: NormalisedBox | undefined | null,
): Promise<RGB> {
  let image;
  try {
    image = await Jimp.read(Buffer.from(base64, "base64"));
  } catch {
    throw new HttpError(
      502,
      "AI_BAD_RESPONSE",
      "Foto tidak bisa dibaca untuk analisis warna. Coba unggah ulang.",
    );
  }

  const source = isUsableBox(box) ? box : FALLBACK_BOX;
  const px = {
    x: Math.max(0, Math.round(source.x * image.width)),
    y: Math.max(0, Math.round(source.y * image.height)),
    w: Math.max(1, Math.round(source.width * image.width)),
    h: Math.max(1, Math.round(source.height * image.height)),
  };
  // Clamp so a box flush against an edge can't ask to crop past the bitmap.
  px.w = Math.min(px.w, image.width - px.x);
  px.h = Math.min(px.h, image.height - px.y);

  const samples: { r: number; g: number; b: number; luma: number }[] = [];
  image.scan(px.x, px.y, px.w, px.h, (_x, _y, idx) => {
    const r = image.bitmap.data[idx];
    const g = image.bitmap.data[idx + 1];
    const b = image.bitmap.data[idx + 2];
    // Rec. 601 luma - just used here to rank samples for trimming, not as a
    // colour output.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    samples.push({ r, g, b, luma });
  });

  if (samples.length < MIN_SAMPLE_PIXELS) {
    throw new HttpError(
      422,
      "AI_BAD_RESPONSE",
      "Area kulit pada foto terlalu kecil untuk dianalisis. Coba foto yang lebih dekat.",
    );
  }

  samples.sort((a, b) => a.luma - b.luma);
  const trim = Math.floor(samples.length * TRIM_FRACTION);
  const kept = samples.slice(trim, samples.length - trim);
  const pool = kept.length > 0 ? kept : samples;

  const avg = pool.reduce(
    (sum, s) => ({ r: sum.r + s.r, g: sum.g + s.g, b: sum.b + s.b }),
    { r: 0, g: 0, b: 0 },
  );

  return {
    r: avg.r / pool.length,
    g: avg.g / pool.length,
    b: avg.b / pool.length,
  };
}
