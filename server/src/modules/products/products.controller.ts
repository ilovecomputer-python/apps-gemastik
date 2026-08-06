import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import {
  CATEGORY_FROM_LABEL,
  toPublicProduct,
} from "./products.serializer.js";
import { listProductsQuerySchema } from "./products.schema.js";

export async function listProducts(req: Request, res: Response) {
  const query = listProductsQuerySchema.parse(req.query);

  const where: Prisma.ProductWhereInput = {};
  if (query.category) where.category = CATEGORY_FROM_LABEL[query.category];
  if (query.halal) where.halal = true;
  if (query.umkm) where.umkm = true;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { brand: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price-asc"
      ? { price: "asc" }
      : query.sort === "price-desc"
        ? { price: "desc" }
        : query.sort === "rating"
          ? { rating: "desc" }
          : { soldCount: "desc" };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: { store: true },
  });

  res.json({ products: products.map(toPublicProduct) });
}

/**
 * Newly launched products.
 *
 * Every default ordering (popular, rating, best-selling) ranks on history a
 * new product cannot have, so it lands last, so nobody sees it, so it never
 * builds history — a loop it cannot escape on its own. This channel sorts the
 * other way round to give new arrivals a route to discovery.
 */
export async function listNewProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { launchedAt: { not: null } },
    orderBy: { launchedAt: "desc" },
    include: { store: true },
    take: 20,
  });

  const now = Date.now();
  res.json({
    products: products.map((product) => ({
      ...toPublicProduct(product),
      launchedAt: product.launchedAt,
      daysSinceLaunch: product.launchedAt
        ? Math.floor((now - product.launchedAt.getTime()) / 86_400_000)
        : null,
    })),
  });
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { store: true },
  });

  if (!product) {
    throw HttpError.notFound("Produk tidak ditemukan");
  }

  res.json({ product: toPublicProduct(product) });
}
