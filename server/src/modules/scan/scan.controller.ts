import type { Request, Response } from "express";
import type { ScanMode } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { toPublicProduct } from "../products/products.serializer.js";

const MODE_PARAM_TO_ENUM: Record<string, ScanMode> = {
  shade: "SHADE",
  skin: "SKIN",
  "face-shape": "FACE_SHAPE",
};

const RESULTS: Record<
  ScanMode,
  { headline: string; detail: string; category: "SKINCARE" | "MAKEUP" }
> = {
  SHADE: {
    headline: "Warm Undertone",
    detail:
      "Kulitmu cenderung warm undertone. Pilih shade dengan dasar kuning/peach untuk hasil paling natural.",
    category: "MAKEUP",
  },
  SKIN: {
    headline: "Kulit Kombinasi, Rentan Kusam",
    detail:
      "Area T-zone cenderung berminyak dengan pipi normal. Fokus pada produk yang menyeimbangkan minyak sekaligus mencerahkan.",
    category: "SKINCARE",
  },
  FACE_SHAPE: {
    headline: "Bentuk Wajah Oval",
    detail:
      "Wajah oval cocok dengan hampir semua teknik contour. Tekankan blush di apple cheeks untuk kesan segar.",
    category: "MAKEUP",
  },
};

export async function analyzeScan(req: Request, res: Response) {
  const mode = MODE_PARAM_TO_ENUM[req.params.mode];
  if (!mode) {
    throw HttpError.badRequest("Mode scan tidak valid", "INVALID_SCAN_MODE");
  }

  const result = RESULTS[mode];

  if (req.userId) {
    await prisma.scanResult.create({
      data: {
        userId: req.userId,
        mode,
        headline: result.headline,
        detail: result.detail,
      },
    });
  }

  const recommendations = await prisma.product.findMany({
    where: { category: result.category },
    include: { store: true },
    orderBy: { soldCount: "desc" },
    take: 4,
  });

  res.json({
    headline: result.headline,
    detail: result.detail,
    recommendations: recommendations.map(toPublicProduct),
  });
}

export async function scanHistory(req: Request, res: Response) {
  const history = await prisma.scanResult.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json({ history });
}
