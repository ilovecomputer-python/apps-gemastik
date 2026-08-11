import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { toPublicProduct } from "../products/products.serializer.js";
import { buildSkinProfile, pickKitProducts, reasonForPick } from "./quiz.scoring.js";
import { submitQuizSchema } from "./quiz.schema.js";

export async function listQuestions(_req: Request, res: Response) {
  const questions = await prisma.quizQuestion.findMany({
    orderBy: { order: "asc" },
    include: { options: true },
  });
  res.json({
    questions: questions.map((q) => ({
      id: q.id,
      order: q.order,
      question: q.question,
      multiSelect: q.multiSelect,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    })),
  });
}

export async function submitQuiz(req: Request, res: Response) {
  const input = submitQuizSchema.parse(req.body);
  const userId = req.userId!;

  const optionIds = Object.values(input.answers).flat();
  const options = await prisma.quizOption.findMany({
    where: { id: { in: optionIds } },
  });
  const tags = options.flatMap((o) => o.tags);

  const profile = buildSkinProfile(tags);

  const products = await prisma.product.findMany({ include: { store: true } });
  const picks = pickKitProducts(products, profile);

  const result = await prisma.$transaction(async (tx) => {
    const quizResult = await tx.quizResult.create({
      data: {
        userId,
        skinType: profile.skinType,
        concerns: profile.concerns,
        newBrandOk: profile.newBrandOk,
      },
    });

    const kit = await tx.personalizedKit.create({
      data: {
        userId,
        quizResultId: quizResult.id,
        items: {
          create: picks.map(({ product }) => ({
            productId: product.id,
            reason: reasonForPick(product, profile),
          })),
        },
      },
      include: { items: { include: { product: { include: { store: true } } } } },
    });

    return { quizResult, kit };
  });

  res.status(201).json({
    profile: {
      skinType: result.quizResult.skinType,
      skinTypeLabel: profile.skinTypeLabel,
      concerns: result.quizResult.concerns,
      concernLabels: profile.concernLabels,
      concernDetails: profile.concernDetails,
      newBrandOk: result.quizResult.newBrandOk,
    },
    kit: {
      id: result.kit.id,
      createdAt: result.kit.createdAt,
      items: result.kit.items.map((item) => ({
        id: item.id,
        reason: item.reason,
        product: toPublicProduct(item.product),
      })),
    },
  });
}

export async function myKits(req: Request, res: Response) {
  const kits = await prisma.personalizedKit.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    include: {
      quizResult: true,
      items: { include: { product: { include: { store: true } } } },
    },
  });

  res.json({
    kits: kits.map((kit) => ({
      id: kit.id,
      createdAt: kit.createdAt,
      skinType: kit.quizResult.skinType,
      concerns: kit.quizResult.concerns,
      items: kit.items.map((item) => ({
        id: item.id,
        reason: item.reason,
        product: toPublicProduct(item.product),
      })),
    })),
  });
}
