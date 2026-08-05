import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { createReviewSchema } from "./reviews.schema.js";
import {
  POINTS_PER_HELPFUL_VOTE,
  POINTS_PER_REVIEW,
  computeBadge,
} from "./reviews.rewards.js";

export async function listProductReviews(req: Request, res: Response) {
  const reviews = await prisma.review.findMany({
    where: { productId: req.params.productId },
    include: { user: true, helpfulVotes: true },
    orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
  });

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt,
      authorName: r.user.name,
      isMine: r.userId === req.userId,
      markedHelpfulByMe: req.userId
        ? r.helpfulVotes.some((v) => v.userId === req.userId)
        : false,
    })),
  });
}

export async function createProductReview(req: Request, res: Response) {
  const input = createReviewSchema.parse(req.body);
  const userId = req.userId!;
  const productId = req.params.productId;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw HttpError.notFound("Produk tidak ditemukan");

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    throw HttpError.conflict(
      "Kamu sudah pernah mengulas produk ini",
      "ALREADY_REVIEWED",
    );
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: { userId, productId, rating: input.rating, text: input.text },
      include: { user: true },
    });
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: POINTS_PER_REVIEW } },
    });
    const agg = await tx.review.aggregate({
      where: { productId },
      _avg: { rating: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { rating: Math.round((agg._avg.rating ?? input.rating) * 10) / 10 },
    });
    return created;
  });

  res.status(201).json({
    review: {
      id: review.id,
      rating: review.rating,
      text: review.text,
      helpfulCount: review.helpfulCount,
      createdAt: review.createdAt,
      authorName: review.user.name,
      isMine: true,
      markedHelpfulByMe: false,
    },
    pointsAwarded: POINTS_PER_REVIEW,
  });
}

export async function toggleHelpful(req: Request, res: Response) {
  const userId = req.userId!;
  const reviewId = req.params.reviewId;

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw HttpError.notFound("Ulasan tidak ditemukan");
  if (review.userId === userId) {
    throw HttpError.forbidden(
      "Tidak bisa menandai ulasan sendiri sebagai membantu",
      "CANNOT_VOTE_OWN_REVIEW",
    );
  }

  const existingVote = await prisma.reviewHelpful.findUnique({
    where: { userId_reviewId: { userId, reviewId } },
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (existingVote) {
      await tx.reviewHelpful.delete({ where: { id: existingVote.id } });
      await tx.user.update({
        where: { id: review.userId },
        data: { points: { decrement: POINTS_PER_HELPFUL_VOTE } },
      });
      return tx.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
      });
    }

    await tx.reviewHelpful.create({ data: { userId, reviewId } });
    await tx.user.update({
      where: { id: review.userId },
      data: { points: { increment: POINTS_PER_HELPFUL_VOTE } },
    });
    return tx.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
    });
  });

  res.json({
    helpfulCount: updated.helpfulCount,
    markedHelpfulByMe: !existingVote,
  });
}

export async function myReviewerStats(req: Request, res: Response) {
  const [reviewCount, helpfulAgg] = await Promise.all([
    prisma.review.count({ where: { userId: req.userId } }),
    prisma.review.aggregate({
      where: { userId: req.userId },
      _sum: { helpfulCount: true },
    }),
  ]);

  const totalHelpful = helpfulAgg._sum.helpfulCount ?? 0;

  res.json({
    reviewCount,
    totalHelpful,
    badge: computeBadge(reviewCount, totalHelpful),
  });
}
