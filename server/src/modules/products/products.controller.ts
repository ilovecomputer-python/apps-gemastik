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
