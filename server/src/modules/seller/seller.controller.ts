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
export async function getMyStore(req: Request, res: Response) {
  const store = await prisma.store.findFirst({
    where: { ownerId: req.userId },
    orderBy: { createdAt: "desc" },
  });

  if (!store) {
    res.json({ store: null });
    return;
  }

  const [productCount, sold] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.orderItem.aggregate({
      where: { product: { storeId: store.id } },
      _sum: { quantity: true },
    }),
  ]);

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
    },
  });
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
