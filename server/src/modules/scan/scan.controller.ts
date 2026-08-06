import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { isGeminiConfigured } from "../../lib/gemini.js";
import { toPublicProduct } from "../products/products.serializer.js";
import { analyzeScanSchema } from "./scan.schema.js";
import { analyseSkin, type ImageInput } from "./scan.vision.js";
import {
  CONCERN_ADVICE,
  CONCERN_LABEL,
  DEPTH_LABEL,
  NOTICEABLE_THRESHOLD,
  SKIN_CONCERNS,
  SKIN_TYPE_LABEL,
  UNDERTONE_ADVICE,
  UNDERTONE_LABEL,
  severityLabel,
  type SkinConcern,
} from "./scan.taxonomy.js";

const DISCLAIMER =
  "Hasil ini analisis kosmetik berbasis AI, bukan diagnosis medis. Untuk keluhan kulit yang menetap, konsultasikan ke dokter kulit.";

const productInclude = { store: true } as const;

/** "a", "a dan b", "a, b, dan c" */
function joinIndonesian(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`;
}

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
 * Rank skincare against the detected concerns. A product scores the sum of the
 * severities of every concern it targets, so the most relevant items for the
 * user's dominant problem float to the top.
 */
async function recommendSkincare(
  scores: Record<SkinConcern, number>,
  detected: SkinConcern[],
) {
  if (detected.length === 0) {
    const fallback = await prisma.product.findMany({
      where: { category: "SKINCARE" },
      include: productInclude,
      orderBy: { rating: "desc" },
      take: 4,
    });
    return fallback.map((product) => ({
      product: toPublicProduct(product),
      reason: "Perawatan harian untuk menjaga kondisi kulitmu tetap sehat.",
    }));
  }

  const products = await prisma.product.findMany({
    where: { concerns: { hasSome: detected } },
    include: productInclude,
  });

  return products
    .map((product) => {
      const matched = product.concerns.filter((c): c is SkinConcern =>
        detected.includes(c as SkinConcern),
      );
      const score = matched.reduce((sum, c) => sum + (scores[c] ?? 0), 0);
      const labels = matched.map((c) => CONCERN_LABEL[c].toLowerCase());
      return {
        product: toPublicProduct(product),
        reason: `Membantu mengatasi ${joinIndonesian(labels)}.`,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ product, reason }) => ({ product, reason }));
}

/** Makeup picks to go with the detected undertone. */
async function recommendMakeup(undertoneLabel: string) {
  const products = await prisma.product.findMany({
    where: { category: "MAKEUP" },
    include: productInclude,
    orderBy: { rating: "desc" },
    take: 3,
  });
  return products.map((product) => ({
    product: toPublicProduct(product),
    reason: `Cocok dipadukan dengan ${undertoneLabel.toLowerCase()}.`,
  }));
}

export async function analyzeScan(req: Request, res: Response) {
  const { base64, mimeType } = analyzeScanSchema.parse(req.body);
  const image: ImageInput = { base64, mimeType };

  const vision = await analyseSkin(image);
  ensureUsableSubject(vision);

  const scores = SKIN_CONCERNS.reduce(
    (acc, concern) => {
      const raw = Number(vision.conditions?.[concern] ?? 0);
      acc[concern] = Math.max(0, Math.min(100, Math.round(raw)));
      return acc;
    },
    {} as Record<SkinConcern, number>,
  );

  const ranked = [...SKIN_CONCERNS].sort((a, b) => scores[b] - scores[a]);
  const detected = ranked.filter((c) => scores[c] >= NOTICEABLE_THRESHOLD);

  const conditions = ranked.map((concern) => ({
    key: concern,
    label: CONCERN_LABEL[concern],
    score: scores[concern],
    severity: severityLabel(scores[concern]),
    advice: CONCERN_ADVICE[concern],
    noticeable: scores[concern] >= NOTICEABLE_THRESHOLD,
  }));

  const skinTypeLabel = SKIN_TYPE_LABEL[vision.skinType] ?? vision.skinType;
  const undertoneLabel = UNDERTONE_LABEL[vision.undertone] ?? vision.undertone;

  const headline =
    detected.length > 0
      ? `Kulit ${skinTypeLabel}, fokus ${CONCERN_LABEL[detected[0]].toLowerCase()}`
      : `Kulit ${skinTypeLabel}, kondisi terjaga`;

  const [skincare, makeup] = await Promise.all([
    recommendSkincare(scores, detected),
    recommendMakeup(undertoneLabel),
  ]);

  if (req.userId) {
    await prisma.scanResult.create({
      data: {
        userId: req.userId,
        mode: "SKIN",
        headline,
        detail: vision.notes,
        skinType: vision.skinType,
        undertone: vision.undertone,
        conditions: scores as unknown as Prisma.InputJsonValue,
      },
    });
  }

  res.json({
    headline,
    detail: vision.notes,
    warning: qualityWarning(vision.imageQuality),
    skinType: vision.skinType,
    skinTypeLabel,
    conditions,
    topConcerns: detected,
    undertone: vision.undertone,
    undertoneLabel,
    undertoneAdvice: UNDERTONE_ADVICE[vision.undertone] ?? "",
    depth: vision.depth,
    depthLabel: DEPTH_LABEL[vision.depth] ?? vision.depth,
    recommendations: [...skincare, ...makeup],
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
