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

/**
 * The tier thresholds are set against *annual* omzet (PP No. 7/2021's UMKM
 * criteria), so the GMV used to resolve a tier has to be the same kind of
 * number - trailing 12 months, not all-time. A store younger than a year
 * naturally gets its GMV since founding, since that's all there is to sum.
 */
function oneYearAgo(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
}

/** First tier (by ascending range) whose bounds contain the GMV; null if the ladder has a gap. */
export function resolveTier(gmv: number, tiersAscending: TierRow[]): TierRow | null {
  return (
    tiersAscending.find((t) => gmv >= t.minGmv && (t.maxGmv === null || gmv <= t.maxGmv)) ?? null
  );
}

/** Trailing 12-month settled GMV for one store - see oneYearAgo() for why not lifetime. */
export async function computeStoreGmv(storeId: string): Promise<number> {
  const items = await prisma.orderItem.findMany({
    where: {
      product: { storeId },
      order: { status: { notIn: [...GMV_EXCLUDED_STATUSES] }, createdAt: { gte: oneYearAgo() } },
    },
    select: { unitPrice: true, quantity: true },
  });
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/**
 * The same trailing-12-month GMV as computeStoreGmv, but for every store at
 * once in a single query - what the admin dashboard's per-store tier list
 * uses instead of calling computeStoreGmv in a loop.
 */
export async function computeGmvByStoreBulk(): Promise<Map<string, number>> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { status: { notIn: [...GMV_EXCLUDED_STATUSES] }, createdAt: { gte: oneYearAgo() } },
    },
    select: { unitPrice: true, quantity: true, product: { select: { storeId: true } } },
  });

  const gmvByStore = new Map<string, number>();
  for (const item of items) {
    // A deleted product leaves its historical order items behind with
    // product set to null (see schema's onDelete: SetNull) - nothing to
    // attribute those to anymore.
    if (!item.product) continue;
    const storeId = item.product.storeId;
    gmvByStore.set(storeId, (gmvByStore.get(storeId) ?? 0) + item.unitPrice * item.quantity);
  }
  return gmvByStore;
}

/** The full tier row a store currently resolves to, based on its trailing-12-month GMV. */
export async function resolveCurrentTier(storeId: string): Promise<TierRow | null> {
  const [tiers, gmv] = await Promise.all([
    prisma.commissionTier.findMany({ orderBy: { sortOrder: "asc" } }),
    computeStoreGmv(storeId),
  ]);
  return resolveTier(gmv, tiers);
}

/**
 * The commission rate each given store would be charged right now, based on
 * its trailing-12-month GMV (not including any order still being created).
 * Resolves the tier ladder once and reuses it across every store in the batch.
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
