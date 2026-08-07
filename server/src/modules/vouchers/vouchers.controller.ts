import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";

const serialiseVoucher = (v: {
  id: string;
  code: string;
  title: string;
  description: string;
  pointsCost: number;
  discountAmount: number;
  minSpend: number;
  validForDays: number;
}) => ({
  id: v.id,
  code: v.code,
  title: v.title,
  description: v.description,
  pointsCost: v.pointsCost,
  discountAmount: v.discountAmount,
  minSpend: v.minSpend,
  validForDays: v.validForDays,
});

/** The catalogue, plus how many points the caller currently has. */
export async function listVouchers(req: Request, res: Response) {
  const [vouchers, user] = await Promise.all([
    prisma.voucher.findMany({
      where: { active: true },
      orderBy: { pointsCost: "asc" },
    }),
    req.userId
      ? prisma.user.findUnique({
          where: { id: req.userId },
          select: { points: true },
        })
      : null,
  ]);

  res.json({
    vouchers: vouchers.map(serialiseVoucher),
    points: user?.points ?? null,
  });
}

/** Vouchers the caller owns: usable ones first, then spent/expired. */
export async function myVouchers(req: Request, res: Response) {
  const owned = await prisma.userVoucher.findMany({
    where: { userId: req.userId },
    include: { voucher: true },
    orderBy: { redeemedAt: "desc" },
  });

  const now = new Date();
  res.json({
    vouchers: owned.map((uv) => ({
      id: uv.id,
      redeemedAt: uv.redeemedAt,
      expiresAt: uv.expiresAt,
      usedAt: uv.usedAt,
      usable: !uv.usedAt && uv.expiresAt > now,
      voucher: serialiseVoucher(uv.voucher),
    })),
  });
}

/**
 * Spend points on a voucher.
 *
 * The balance check and the deduction run in one transaction, and the update
 * is filtered on the balance still being sufficient — two redemptions fired at
 * once would otherwise both read the old balance and go through.
 */
export async function redeemVoucher(req: Request, res: Response) {
  const userId = req.userId!;
  const voucher = await prisma.voucher.findFirst({
    where: { id: req.params.id, active: true },
  });
  if (!voucher) throw HttpError.notFound("Voucher tidak ditemukan");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });
  if (!user || user.points < voucher.pointsCost) {
    throw HttpError.badRequest(
      `Poin kamu belum cukup. Butuh ${voucher.pointsCost} poin, kamu punya ${user?.points ?? 0}.`,
      "INSUFFICIENT_POINTS",
    );
  }

  const expiresAt = new Date(
    Date.now() + voucher.validForDays * 24 * 60 * 60 * 1000,
  );

  const result = await prisma.$transaction(async (tx) => {
    const deducted = await tx.user.updateMany({
      where: { id: userId, points: { gte: voucher.pointsCost } },
      data: { points: { decrement: voucher.pointsCost } },
    });
    // Lost the race against a concurrent redemption.
    if (deducted.count === 0) return null;

    return tx.userVoucher.create({
      data: { userId, voucherId: voucher.id, expiresAt },
      include: { voucher: true },
    });
  });

  if (!result) {
    throw HttpError.badRequest(
      "Poin kamu belum cukup.",
      "INSUFFICIENT_POINTS",
    );
  }

  const remaining = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  res.status(201).json({
    userVoucher: {
      id: result.id,
      expiresAt: result.expiresAt,
      voucher: serialiseVoucher(result.voucher),
    },
    pointsRemaining: remaining?.points ?? 0,
    message: `${voucher.title} berhasil ditukar. Pakai saat checkout.`,
  });
}
