import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { toPublicProduct } from "../products/products.serializer.js";

export async function listCart(req: Request, res: Response) {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.userId },
    include: { product: { include: { store: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    items: items.map((item) => ({
      product: toPublicProduct(item.product),
      quantity: item.quantity,
    })),
  });
}

export async function addToCart(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.productId },
  });
  if (!product) {
    throw HttpError.notFound("Produk tidak ditemukan");
  }

  const item = await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: req.userId!,
        productId: req.params.productId,
      },
    },
    create: { userId: req.userId!, productId: req.params.productId, quantity: 1 },
    update: { quantity: { increment: 1 } },
  });

  res.status(201).json({ quantity: item.quantity });
}

export async function decrementCartItem(req: Request, res: Response) {
  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: req.userId!,
        productId: req.params.productId,
      },
    },
  });

  if (!existing) {
    res.json({ quantity: 0 });
    return;
  }

  if (existing.quantity <= 1) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    res.json({ quantity: 0 });
    return;
  }

  const updated = await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity: { decrement: 1 } },
  });
  res.json({ quantity: updated.quantity });
}

export async function removeCartItem(req: Request, res: Response) {
  await prisma.cartItem.deleteMany({
    where: { userId: req.userId, productId: req.params.productId },
  });
  res.json({ ok: true });
}

export async function clearCart(req: Request, res: Response) {
  await prisma.cartItem.deleteMany({ where: { userId: req.userId } });
  res.json({ ok: true });
}
