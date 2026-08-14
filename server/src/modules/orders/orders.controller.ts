import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { resolveFeePercentsByStore } from "../../lib/commission.js";
import { createOrderSchema } from "./orders.schema.js";
import { markVoucherUsed, resolveVoucher } from "./orders.voucher.js";

function generateOrderNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AURA-${random}`;
}

const orderInclude = {
  address: true,
  shippingOption: true,
  paymentMethod: true,
  items: true,
} as const;

export async function createOrder(req: Request, res: Response) {
  const input = createOrderSchema.parse(req.body);
  const userId = req.userId!;

  const [address, shippingOption, paymentMethod, cartItems] = await Promise.all([
    prisma.address.findFirst({ where: { id: input.addressId, userId } }),
    prisma.shippingOption.findUnique({ where: { id: input.shippingOptionId } }),
    prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } }),
    prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    }),
  ]);

  if (!address) throw HttpError.badRequest("Alamat tidak valid", "INVALID_ADDRESS");
  if (!shippingOption)
    throw HttpError.badRequest("Metode pengiriman tidak valid", "INVALID_SHIPPING");
  if (!paymentMethod)
    throw HttpError.badRequest("Metode pembayaran tidak valid", "INVALID_PAYMENT");
  if (cartItems.length === 0)
    throw HttpError.badRequest("Keranjang masih kosong", "EMPTY_CART");

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const applied = await resolveVoucher(userId, input.userVoucherId, subtotal);
  const discount = applied?.discount ?? 0;
  const total = subtotal + shippingOption.price - discount;

  // Resolved from each store's GMV so far - this order isn't in the DB yet,
  // so it doesn't count toward its own tier. Fixed on the item from here on.
  const feePercentByStore = await resolveFeePercentsByStore(
    cartItems.map((item) => item.product.storeId),
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId: address.id,
        shippingOptionId: shippingOption.id,
        paymentMethodId: paymentMethod.id,
        subtotal,
        shippingFee: shippingOption.price,
        discount,
        total,
        status: "PAID",
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            brand: item.product.brand,
            name: item.product.name,
            unitPrice: item.product.price,
            quantity: item.quantity,
            platformFeePercent: feePercentByStore.get(item.product.storeId) ?? null,
          })),
        },
      },
      include: orderInclude,
    });

    if (applied) {
      const spent = await markVoucherUsed(tx, applied.userVoucherId, created.id);
      // Another checkout claimed it between validation and here.
      if (spent.count === 0) {
        throw HttpError.conflict(
          "Voucher ini baru saja dipakai di pesanan lain.",
          "VOUCHER_USED",
        );
      }
    }

    await tx.cartItem.deleteMany({ where: { userId } });

    return created;
  });

  res.status(201).json({ order });
}

export async function listOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { userId: req.userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: orderInclude,
  });
  if (!order) throw HttpError.notFound("Pesanan tidak ditemukan");
  res.json({ order });
}
