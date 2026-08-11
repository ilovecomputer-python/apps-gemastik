import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { isGeminiConfigured } from "../../lib/gemini.js";
import { toPublicProduct } from "../products/products.serializer.js";
import { analyzeScanSchema } from "./scan.schema.js";
import { analyseSkin, type ImageInput } from "./scan.vision.js";
import { sampleSkinColour } from "./scan.pixels.js";
import {
  FITZPATRICK_LABEL,
  SEASON_PROFILE,
  UNDERTONE_ADVICE,
  UNDERTONE_LABEL,
  computeIta,
  deriveChroma,
  deriveHue,
  deriveSeason,
  deriveValue,
  itaToFitzpatrick,
  labChroma,
  matchShadeCode,
  rgbToLab,
  type Hue,
} from "./scan.colour.js";

const DISCLAIMER =
  "Hasil warna & shade ini analisis kosmetik berbasis pengukuran foto, bukan diagnosis medis. Akurasi warna tetap dipengaruhi pencahayaan foto.";

const productInclude = { store: true } as const;

function ensureUsableSubject(vision: { subject: string }) {
  if (vision.subject === "other") {
    throw HttpError.badRequest(
      "Foto tidak menampilkan kulit wajah. Coba unggah selfie yang jelas.",
      "NO_FACE_DETECTED",
    );
  }
}

/**
 * Low-quality photos still get a result — blocking the user outright is worse
 * UX than showing the analysis with a caveat.
 */
function qualityWarning(imageQuality: string): string | null {
  return imageQuality === "poor"
    ? "Kualitas foto kurang optimal, hasil bisa kurang akurat. Coba ulangi dengan cahaya lebih merata."
    : null;
}

/**
 * Makeup picks for the colour analysis. Products whose shades follow the
 * catalogue's N/W/C depth convention get a concrete shade recommendation;
 * the rest are matched through the seasonal palette instead.
 */
async function recommendMakeup(hue: Hue, fitzpatrick: number, seasonLabel: string) {
  const products = await prisma.product.findMany({
    where: { category: "MAKEUP" },
    include: productInclude,
    orderBy: { rating: "desc" },
    take: 8,
  });

  return products.map((product) => {
    const match = matchShadeCode(product.shades, hue, fitzpatrick);
    if (match) {
      return {
        product: toPublicProduct(product),
        reason: match.exactUndertone
          ? `Shade ${match.shade} paling mendekati undertone dan kedalaman kulitmu.`
          : `Shade ${match.shade} paling mendekati kedalaman kulitmu (undertone persis belum tersedia).`,
        matchedShade: match.shade,
      };
    }
    return {
      product: toPublicProduct(product),
      reason: `Masuk ke palet ${seasonLabel}.`,
      matchedShade: null,
    };
  });
}

export async function analyzeScan(req: Request, res: Response) {
  const { base64, mimeType } = analyzeScanSchema.parse(req.body);
  const image: ImageInput = { base64, mimeType };

  const vision = await analyseSkin(image);
  ensureUsableSubject(vision);

  // Everything colour-related from here is MEASURED off the photo's own
  // pixels, not asked of the vision model — see scan.pixels.ts / scan.colour.ts.
  const rgb = await sampleSkinColour(base64, vision.skinPatch);
  const lab = rgbToLab(rgb);

  const hue = deriveHue(lab);
  const value = deriveValue(lab);
  const chroma = deriveChroma(lab);
  const ita = computeIta(lab);
  const fitzpatrick = itaToFitzpatrick(ita);

  const undertoneLabel = UNDERTONE_LABEL[hue];

  // Personal colour: the axes are measured, the season is derived from a
  // fixed table so the classification stays auditable.
  const season = deriveSeason(hue, value, chroma);
  const seasonProfile = SEASON_PROFILE[season];

  const headline = `${seasonProfile.label} · ${undertoneLabel}`;

  const makeup = await recommendMakeup(hue, fitzpatrick, seasonProfile.label);
  const matchedShade = makeup.find((m) => m.matchedShade)?.matchedShade ?? null;

  if (req.userId) {
    await prisma.scanResult.create({
      data: {
        userId: req.userId,
        mode: "SKIN",
        headline,
        detail: vision.notes,
        // Personal colour + shade, stored so later sessions can personalise
        // without asking the user to scan again.
        undertone: hue,
        season,
        colourValue: value,
        colourChroma: chroma,
        fitzpatrick,
        matchedShade,
      },
    });
  }

  res.json({
    headline,
    detail: vision.notes,
    warning: qualityWarning(vision.imageQuality),

    // Personal colour — derived from measured Lab axes.
    personalColour: {
      season,
      label: seasonProfile.label,
      summary: seasonProfile.summary,
      palette: seasonProfile.palette,
      avoid: seasonProfile.avoid,
      axes: { hue, value, chroma },
    },

    // Skin shade — ITA°-derived depth + undertone, matched to real shade codes.
    skinShade: {
      fitzpatrick,
      fitzpatrickLabel: FITZPATRICK_LABEL[fitzpatrick],
      undertone: hue,
      undertoneLabel,
      undertoneAdvice: UNDERTONE_ADVICE[hue] ?? "",
      matchedShade,
    },

    // Raw measurements, so the result is auditable rather than a black box.
    measurement: {
      lab: { l: Math.round(lab.l * 10) / 10, a: Math.round(lab.a * 10) / 10, b: Math.round(lab.b * 10) / 10 },
      ita: Math.round(ita * 10) / 10,
      chroma: Math.round(labChroma(lab) * 10) / 10,
    },

    recommendations: makeup,
    disclaimer: DISCLAIMER,
  });
}

export async function scanStatus(_req: Request, res: Response) {
  res.json({ enabled: isGeminiConfigured() });
}

export async function scanHistory(req: Request, res: Response) {
  const history = await prisma.scanResult.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json({ history });
}
