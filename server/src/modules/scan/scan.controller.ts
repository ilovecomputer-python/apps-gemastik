import type { Request, Response } from "express";
import type { Prisma, ScanMode } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { isGeminiConfigured } from "../../lib/gemini.js";
import { toPublicProduct } from "../products/products.serializer.js";
import { analyzeScanSchema } from "./scan.schema.js";
import {
  analyseFaceShape,
  analyseShade,
  analyseSkin,
  type ImageInput,
  type VisionSubject,
} from "./scan.vision.js";
import {
  CONCERN_ADVICE,
  CONCERN_LABEL,
  DEPTH_LABEL,
  FACE_SHAPE_LABEL,
  NOTICEABLE_THRESHOLD,
  SKIN_CONCERNS,
  SKIN_TYPE_LABEL,
  UNDERTONE_LABEL,
  severityLabel,
  type SkinConcern,
} from "./scan.taxonomy.js";

const MODE_PARAM_TO_ENUM: Record<string, ScanMode> = {
  shade: "SHADE",
  skin: "SKIN",
  "face-shape": "FACE_SHAPE",
};

const DISCLAIMER =
  "Hasil ini analisis kosmetik berbasis AI, bukan diagnosis medis. Untuk keluhan kulit yang menetap, konsultasikan ke dokter kulit.";

const productInclude = { store: true } as const;

/** Face-shape specific makeup tips, keyed by the taxonomy value. */
const FACE_SHAPE_TIPS: Record<string, string> = {
  oval: "Hampir semua teknik contour cocok. Tekankan blush di apple cheeks untuk kesan segar.",
  round:
    "Contour di sisi pipi dan pelipis untuk memberi dimensi, aplikasikan blush sedikit menyerong ke atas.",
  square:
    "Lembutkan sudut rahang dengan contour membulat, blush membulat di tulang pipi.",
  heart:
    "Seimbangkan dahi yang lebih lebar dengan contour tipis di garis rambut, blush di bagian tengah pipi.",
  oblong:
    "Contour di dahi atas dan dagu untuk memberi kesan lebih pendek, blush horizontal di tulang pipi.",
  diamond:
    "Lembutkan tulang pipi yang menonjol, tambahkan highlight di dahi dan dagu.",
};

/**
 * @param requireFullFace shade and face-shape analysis genuinely need the whole
 * face; skin analysis still works on a close-up of one area.
 */
function ensureUsableSubject(
  vision: { subject: VisionSubject; imageQuality: string },
  requireFullFace: boolean,
) {
  if (vision.subject === "other") {
    throw HttpError.badRequest(
      "Foto tidak menampilkan kulit wajah. Coba unggah selfie yang jelas.",
      "NO_FACE_DETECTED",
    );
  }
  if (requireFullFace && vision.subject !== "face") {
    throw HttpError.badRequest(
      "Analisa ini butuh wajah utuh. Pastikan seluruh wajah terlihat dan menghadap kamera.",
      "FULL_FACE_REQUIRED",
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
 * Rank catalogue products against the detected concerns. A product scores the
 * sum of the severities of every concern it targets, so the most relevant
 * items for the user's dominant problem float to the top.
 */
/** "a", "a dan b", "a, b, dan c" */
function joinIndonesian(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} dan ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`;
}

async function recommendForConcerns(
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
    .slice(0, 6)
    .map(({ product, reason }) => ({ product, reason }));
}

async function recommendMakeup(reason: string, where: Prisma.ProductWhereInput) {
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: { rating: "desc" },
    take: 4,
  });
  return products.map((product) => ({
    product: toPublicProduct(product),
    reason,
  }));
}

export async function analyzeScan(req: Request, res: Response) {
  const mode = MODE_PARAM_TO_ENUM[req.params.mode];
  if (!mode) {
    throw HttpError.badRequest("Mode scan tidak valid", "INVALID_SCAN_MODE");
  }

  const { base64, mimeType } = analyzeScanSchema.parse(req.body);
  const image: ImageInput = { base64, mimeType };

  let headline: string;
  let detail: string;
  let warning: string | null;
  let payload: Record<string, unknown>;
  let recommendations: { product: unknown; reason: string }[];
  let persisted: {
    skinType?: string;
    undertone?: string;
    faceShape?: string;
    conditions?: Prisma.InputJsonValue;
  } = {};

  if (mode === "SKIN") {
    const vision = await analyseSkin(image);
    ensureUsableSubject(vision, false);
    warning = qualityWarning(vision.imageQuality);

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
    headline =
      detected.length > 0
        ? `Kulit ${skinTypeLabel}, fokus ${CONCERN_LABEL[detected[0]].toLowerCase()}`
        : `Kulit ${skinTypeLabel}, kondisi terjaga`;
    detail = vision.notes;

    recommendations = await recommendForConcerns(scores, detected);
    payload = {
      skinType: vision.skinType,
      skinTypeLabel,
      conditions,
      topConcerns: detected,
    };
    persisted = {
      skinType: vision.skinType,
      conditions: scores as unknown as Prisma.InputJsonValue,
    };
  } else if (mode === "SHADE") {
    const vision = await analyseShade(image);
    ensureUsableSubject(vision, true);
    warning = qualityWarning(vision.imageQuality);

    headline = UNDERTONE_LABEL[vision.undertone] ?? vision.undertone;
    detail = vision.notes;
    recommendations = await recommendMakeup(
      "Cocok dipadukan dengan undertone kulitmu.",
      { category: "MAKEUP" },
    );
    payload = {
      undertone: vision.undertone,
      depth: vision.depth,
      depthLabel: DEPTH_LABEL[vision.depth] ?? vision.depth,
    };
    persisted = { undertone: vision.undertone };
  } else {
    const vision = await analyseFaceShape(image);
    ensureUsableSubject(vision, true);
    warning = qualityWarning(vision.imageQuality);

    const shapeLabel = FACE_SHAPE_LABEL[vision.faceShape] ?? vision.faceShape;
    headline = `Bentuk Wajah ${shapeLabel}`;
    detail = vision.notes;
    recommendations = await recommendMakeup(
      "Pilihan makeup untuk mempertegas bentuk wajahmu.",
      { category: "MAKEUP" },
    );
    payload = {
      faceShape: vision.faceShape,
      faceShapeLabel: shapeLabel,
      tips: FACE_SHAPE_TIPS[vision.faceShape] ?? "",
    };
    persisted = { faceShape: vision.faceShape };
  }

  if (req.userId) {
    await prisma.scanResult.create({
      data: {
        userId: req.userId,
        mode,
        headline,
        detail,
        ...persisted,
      },
    });
  }

  res.json({
    mode: req.params.mode,
    headline,
    detail,
    warning,
    ...payload,
    recommendations,
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
