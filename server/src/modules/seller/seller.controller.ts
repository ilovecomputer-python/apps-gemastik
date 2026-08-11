import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { toPublicProduct } from "../products/products.serializer.js";
import { createProductSchema } from "./seller.schema.js";

/** Turn a product name into a URL-safe slug, kept unique with a short suffix. */
function toSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "produk"}-${Math.random().toString(36).slice(2, 7)}`;
}

async function requireOwnedStore(userId: string) {
  const store = await prisma.store.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  if (!store) {
    throw HttpError.notFound(
      "Kamu belum punya brand terdaftar.",
      "NO_STORE",
    );
  }
  return store;
}

/**
 * The seller's own store, whatever its review state. A PENDING brand still
 * needs somewhere to see that it is waiting, otherwise applying feels like
 * shouting into a void.
 */
/** Orders touching this store, regardless of who else's items ride along in the same cart. */
const storeOrderFilter = (storeId: string) => ({
  items: { some: { product: { storeId } } },
});

/**
 * Orders sit in one of two buckets for a seller: still needs their action, or
 * already handled. PAID means "pay-in confirmed, nothing packed yet"; PROCESSING
 * means "packed, not yet handed to courier" - both need the seller to do
 * something next, which is what the dashboard's "Pesanan Baru" count means.
 */
const NEEDS_ACTION_STATUSES = ["PAID", "PROCESSING"] as const;

function startOfThisMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getMyStore(req: Request, res: Response) {
  const store = await prisma.store.findFirst({
    where: { ownerId: req.userId },
    orderBy: { createdAt: "desc" },
  });

  if (!store) {
    res.json({ store: null });
    return;
  }

  const [productCount, sold, newOrders, monthItems, completedCount, cancelledCount] =
    await Promise.all([
      prisma.product.count({ where: { storeId: store.id } }),
      prisma.orderItem.aggregate({
        where: { product: { storeId: store.id } },
        _sum: { quantity: true },
      }),
      prisma.order.count({
        where: { status: { in: [...NEEDS_ACTION_STATUSES] }, ...storeOrderFilter(store.id) },
      }),
      // Revenue counts only orders that actually settled - PENDING is an
      // abandoned/unpaid checkout, not money the seller can expect.
      prisma.orderItem.findMany({
        where: {
          product: { storeId: store.id },
          order: {
            status: { notIn: ["PENDING", "CANCELLED"] },
            createdAt: { gte: startOfThisMonth() },
          },
        },
        select: { unitPrice: true, quantity: true },
      }),
      prisma.order.count({
        where: { status: "COMPLETED", ...storeOrderFilter(store.id) },
      }),
      prisma.order.count({
        where: { status: "CANCELLED", ...storeOrderFilter(store.id) },
      }),
    ]);

  const revenueThisMonth = monthItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const concludedCount = completedCount + cancelledCount;

  res.json({
    store: {
      id: store.id,
      name: store.name,
      tagline: store.tagline,
      story: store.story,
      city: store.city,
      status: store.status,
      rating: store.rating,
      launchDate: store.launchDate,
      createdAt: store.createdAt,
      productCount,
      unitsSold: sold._sum.quantity ?? 0,
      newOrdersCount: newOrders,
      revenueThisMonth,
      completedOrders: completedCount,
      // null (not 0%) until any order has actually concluded - a fresh store
      // hasn't earned a rate yet, good or bad.
      fulfillmentRate:
        concludedCount > 0 ? Math.round((completedCount / concludedCount) * 100) : null,
    },
  });
}

/** Money still moving through fulfilment - not the seller's to spend yet. */
const HELD_STATUSES = ["PAID", "PROCESSING", "SHIPPED"] as const;
const FINANCE_MONTHS = 6;

const sumItems = (items: { unitPrice: number; quantity: number }[]) =>
  items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

/** The first-of-month boundaries for the trailing N months, oldest first. */
function financeMonthWindows(count: number) {
  const now = new Date();
  const windows: { key: string; start: Date; end: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    windows.push({ key, start, end });
  }
  return windows;
}

/**
 * Saldo toko: a computed balance, not a stored ledger - there is no payout
 * system behind this, so "available" and "held" are read straight off order
 * status rather than money actually moving anywhere.
 */
export async function getMyFinance(req: Request, res: Response) {
  const store = await requireOwnedStore(req.userId!);
  const windows = financeMonthWindows(FINANCE_MONTHS);
  const windowStart = windows[0].start;

  const [recentItems, completedItems, heldItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        product: { storeId: store.id },
        order: { status: { notIn: ["PENDING", "CANCELLED"] }, createdAt: { gte: windowStart } },
      },
      select: { unitPrice: true, quantity: true, orderId: true, order: { select: { createdAt: true } } },
    }),
    prisma.orderItem.findMany({
      where: { product: { storeId: store.id }, order: { status: "COMPLETED" } },
      select: { unitPrice: true, quantity: true },
    }),
    prisma.orderItem.findMany({
      where: { product: { storeId: store.id }, order: { status: { in: [...HELD_STATUSES] } } },
      select: { unitPrice: true, quantity: true },
    }),
  ]);

  const monthly = windows.map(({ key, start, end }) => {
    const items = recentItems.filter(
      (item) => item.order.createdAt >= start && item.order.createdAt < end,
    );
    return {
      month: key,
      revenue: sumItems(items),
      orderCount: new Set(items.map((item) => item.orderId)).size,
    };
  });

  const available = sumItems(completedItems);
  const pending = sumItems(heldItems);

  res.json({
    finance: {
      balance: { available, pending, lifetime: available + pending },
      monthly,
    },
  });
}

export async function listMyOrders(req: Request, res: Response) {
  const store = await requireOwnedStore(req.userId!);

  const orders = await prisma.order.findMany({
    where: storeOrderFilter(store.id),
    include: {
      items: { where: { product: { storeId: store.id } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      subtotal: order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    })),
  });
}

/** The one forward step a seller may push an order through from here. */
const NEXT_STATUS: Partial<Record<string, "PROCESSING" | "SHIPPED">> = {
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
};

/**
 * Deliberately one step at a time, not "set to any status" - a seller
 * shouldn't be able to jump an order straight to COMPLETED or resurrect a
 * CANCELLED one from this endpoint.
 */
export async function advanceOrderStatus(req: Request, res: Response) {
  const store = await requireOwnedStore(req.userId!);

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, ...storeOrderFilter(store.id) },
  });
  if (!order) throw HttpError.notFound("Pesanan tidak ditemukan");

  const next = NEXT_STATUS[order.status];
  if (!next) {
    throw HttpError.conflict(
      `Pesanan berstatus ${order.status} tidak bisa diproses lebih lanjut dari sini.`,
      "INVALID_TRANSITION",
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: next },
  });

  res.json({ order: { id: updated.id, status: updated.status } });
}

export async function listMyProducts(req: Request, res: Response) {
  const store = await requireOwnedStore(req.userId!);
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { store: true, _count: { select: { reviews: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    products: products.map((p) => ({
      ...toPublicProduct(p),
      reviewCount: p._count.reviews,
      launchedAt: p.launchedAt,
    })),
  });
}

/**
 * Sellers may only list products once their brand is approved — otherwise an
 * unreviewed applicant could push items into the public catalogue.
 */
export async function createMyProduct(req: Request, res: Response) {
  const store = await requireOwnedStore(req.userId!);
  if (store.status !== "APPROVED") {
    throw HttpError.forbidden(
      "Brand kamu belum disetujui admin, jadi produk belum bisa ditambahkan.",
      "STORE_NOT_APPROVED",
    );
  }

  const input = createProductSchema.parse(req.body);

  const product = await prisma.product.create({
    data: {
      slug: toSlug(input.name),
      brand: store.name.toUpperCase(),
      name: input.name,
      price: input.price,
      category: input.category,
      description: input.description,
      concerns: input.concerns,
      shades: input.shades,
      halal: input.halal,
      // Everything a seller lists is by definition a local small brand.
      umkm: true,
      color: input.color,
      hashtags: [],
      storeId: store.id,
      // New listings go straight into the new-arrivals channel.
      launchedAt: new Date(),
    },
    include: { store: true },
  });

  res.status(201).json({ product: toPublicProduct(product) });
}
