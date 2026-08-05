import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { toPublicProduct } from "../products/products.serializer.js";

export async function listWishlist(req: Request, res: Response) {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.userId },
    include: { product: { include: { store: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ products: items.map((item) => toPublicProduct(item.product)) });
}

export async function addToWishlist(req: Request, res: Response) {
  await prisma.wishlist.upsert({
    where: {
      userId_productId: {
        userId: req.userId!,
        productId: req.params.productId,
      },
    },
    create: { userId: req.userId!, productId: req.params.productId },
    update: {},
  });

  res.status(201).json({ ok: true });
}

export async function removeFromWishlist(req: Request, res: Response) {
  await prisma.wishlist.deleteMany({
    where: { userId: req.userId, productId: req.params.productId },
  });

  res.json({ ok: true });
}
