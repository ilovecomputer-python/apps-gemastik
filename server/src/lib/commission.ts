import { prisma } from "./prisma.js";

/** A PENDING cart or a CANCELLED order never became real revenue - GMV excludes both. */
export const GMV_EXCLUDED_STATUSES = ["PENDING", "CANCELLED"] as const;

export type TierRow = {
  id: string;
  name: string;
  minGmv: number;
  maxGmv: number | null;
  feePercent: number;
};

/** First tier (by ascending range) whose bounds contain the GMV; null if the ladder has a gap. */
export function resolveTier(gmv: number, tiersAscending: TierRow[]): TierRow | null {
  return (
    tiersAscending.find((t) => gmv >= t.minGmv && (t.maxGmv === null || gmv <= t.maxGmv)) ?? null
  );
}

/** Lifetime settled GMV for one store - same "not pending/cancelled" definition Saldo Toko uses. */
export async function computeStoreGmv(storeId: string): Promise<number> {
  const items = await prisma.orderItem.findMany({
    where: { product: { storeId }, order: { status: { notIn: [...GMV_EXCLUDED_STATUSES] } } },
    select: { unitPrice: true, quantity: true },
  });
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/** The full tier row a store currently resolves to, based on its GMV so far. */
export async function resolveCurrentTier(storeId: string): Promise<TierRow | null> {
  const [tiers, gmv] = await Promise.all([
    prisma.commissionTier.findMany({ orderBy: { sortOrder: "asc" } }),
    computeStoreGmv(storeId),
  ]);
  return resolveTier(gmv, tiers);
}

/**
 * The commission rate each given store would be charged right now, based on
 * its GMV so far (not including any order still being created). Resolves the
 * tier ladder once and reuses it across every store in the batch.
 */
export async function resolveFeePercentsByStore(
  storeIds: string[],
): Promise<Map<string, number | null>> {
  const uniqueIds = [...new Set(storeIds)];
  if (uniqueIds.length === 0) return new Map();

  const tiers = await prisma.commissionTier.findMany({ orderBy: { sortOrder: "asc" } });
  const entries = await Promise.all(
    uniqueIds.map(async (storeId) => {
      const gmv = await computeStoreGmv(storeId);
      return [storeId, resolveTier(gmv, tiers)?.feePercent ?? null] as const;
    }),
  );
  return new Map(entries);
}
