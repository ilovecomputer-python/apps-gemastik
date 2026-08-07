import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";

export interface AppliedVoucher {
  userVoucherId: string;
  discount: number;
  title: string;
}

/**
 * Validate a voucher the shopper wants to spend and work out the discount.
 *
 * The amount is derived here from the stored voucher, never taken from the
 * request, and the voucher must belong to the caller — otherwise anyone could
 * post someone else's voucher id, or their own discount figure.
 */
export async function resolveVoucher(
  userId: string,
  userVoucherId: string | undefined,
  subtotal: number,
): Promise<AppliedVoucher | null> {
  if (!userVoucherId) return null;

  const owned = await prisma.userVoucher.findFirst({
    where: { id: userVoucherId, userId },
    include: { voucher: true },
  });

  if (!owned) {
    throw HttpError.badRequest("Voucher tidak ditemukan.", "INVALID_VOUCHER");
  }
  if (owned.usedAt) {
    throw HttpError.badRequest("Voucher ini sudah dipakai.", "VOUCHER_USED");
  }
  if (owned.expiresAt <= new Date()) {
    throw HttpError.badRequest("Voucher ini sudah kedaluwarsa.", "VOUCHER_EXPIRED");
  }
  if (subtotal < owned.voucher.minSpend) {
    throw HttpError.badRequest(
      `Voucher ini butuh belanja minimal Rp${owned.voucher.minSpend.toLocaleString("id-ID")}.`,
      "MIN_SPEND_NOT_MET",
    );
  }

  return {
    userVoucherId: owned.id,
    // Never let a discount exceed the goods; shipping is still payable.
    discount: Math.min(owned.voucher.discountAmount, subtotal),
    title: owned.voucher.title,
  };
}

/**
 * Mark the voucher spent, tied to the order. Filtered on usedAt still being
 * null so the same voucher cannot be consumed by two concurrent checkouts —
 * the unique orderId index is the second line of defence.
 */
export function markVoucherUsed(
  tx: Prisma.TransactionClient,
  userVoucherId: string,
  orderId: string,
) {
  return tx.userVoucher.updateMany({
    where: { id: userVoucherId, usedAt: null },
    data: { usedAt: new Date(), orderId },
  });
}
