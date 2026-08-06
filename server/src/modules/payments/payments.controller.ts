import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import {
  STRIPE_CURRENCY,
  STRIPE_MINIMUM_RUPIAH,
  getStripe,
  isStripeConfigured,
  toStripeAmount,
} from "../../lib/stripe.js";
import { env } from "../../lib/env.js";
import { createPaymentIntentSchema } from "./payments.schema.js";

function generateOrderNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AURA-${random}`;
}

export async function paymentsStatus(_req: Request, res: Response) {
  res.json({ enabled: isStripeConfigured() });
}

/**
 * Creates a PENDING order and the matching Stripe PaymentIntent.
 *
 * The amount is derived from the user's own cart rows server-side — a client
 * that posts its own total could otherwise pay one rupiah for anything.
 * The cart is deliberately NOT cleared here; only a confirmed payment
 * (via webhook) may do that, so an abandoned checkout leaves the cart intact.
 */
export async function createPaymentIntent(req: Request, res: Response) {
  const input = createPaymentIntentSchema.parse(req.body);
  const userId = req.userId!;

  const [address, shippingOption, paymentMethod, cartItems] = await Promise.all([
    prisma.address.findFirst({ where: { id: input.addressId, userId } }),
    prisma.shippingOption.findUnique({ where: { id: input.shippingOptionId } }),
    prisma.paymentMethod.findUnique({ where: { id: input.paymentMethodId } }),
    prisma.cartItem.findMany({ where: { userId }, include: { product: true } }),
  ]);

  if (!address) throw HttpError.badRequest("Alamat tidak valid", "INVALID_ADDRESS");
  if (!shippingOption)
    throw HttpError.badRequest("Metode pengiriman tidak valid", "INVALID_SHIPPING");
  if (!paymentMethod)
    throw HttpError.badRequest("Metode pembayaran tidak valid", "INVALID_PAYMENT");
  if (paymentMethod.provider !== "stripe")
    throw HttpError.badRequest(
      "Metode pembayaran ini tidak lewat kartu.",
      "NOT_A_STRIPE_METHOD",
    );
  if (cartItems.length === 0)
    throw HttpError.badRequest("Keranjang masih kosong", "EMPTY_CART");

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const total = subtotal + shippingOption.price;

  if (total < STRIPE_MINIMUM_RUPIAH) {
    throw HttpError.badRequest(
      `Minimum pembayaran kartu Rp${STRIPE_MINIMUM_RUPIAH.toLocaleString("id-ID")}. Tambah produk atau pilih COD.`,
      "AMOUNT_BELOW_MINIMUM",
    );
  }

  const stripe = getStripe();

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      addressId: address.id,
      shippingOptionId: shippingOption.id,
      paymentMethodId: paymentMethod.id,
      subtotal,
      shippingFee: shippingOption.price,
      total,
      status: "PENDING",
      items: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          brand: item.product.brand,
          name: item.product.name,
          unitPrice: item.product.price,
          quantity: item.quantity,
        })),
      },
    },
  });

  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: toStripeAmount(total),
      currency: STRIPE_CURRENCY,
      // Lets Stripe surface cards plus any wallet the device supports.
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: order.id, orderNumber: order.orderNumber, userId },
      description: `AURA Marketplace ${order.orderNumber}`,
    });
  } catch (err) {
    // Don't strand a PENDING order that can never be paid.
    await prisma.order.delete({ where: { id: order.id } });
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe PaymentIntent creation failed:", message);
    throw new HttpError(
      502,
      "PAYMENT_INIT_FAILED",
      "Gagal memulai pembayaran. Coba lagi sebentar lagi.",
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: intent.id },
  });

  res.status(201).json({
    clientSecret: intent.client_secret,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: total,
    currency: STRIPE_CURRENCY,
    returnUrl: `${env.APP_URL}/?payment=done`,
  });
}

/**
 * Marks the order paid and clears the cart. Driven by the webhook so the
 * order settles even if the shopper closes the tab mid-redirect, and written
 * with updateMany on a PENDING filter so a replayed event is a no-op.
 */
async function settleOrder(paymentIntentId: string) {
  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (!order) {
    console.warn(`Webhook for unknown payment intent ${paymentIntentId}`);
    return;
  }
  if (order.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    }),
    prisma.cartItem.deleteMany({ where: { userId: order.userId } }),
  ]);

  console.log(`Order ${order.orderNumber} settled via Stripe`);
}

async function failOrder(paymentIntentId: string) {
  await prisma.order.updateMany({
    where: { stripePaymentIntentId: paymentIntentId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  if (!env.STRIPE_WEBHOOK_SECRET || typeof signature !== "string") {
    throw HttpError.badRequest(
      "Webhook signature tidak valid",
      "INVALID_WEBHOOK",
    );
  }

  const stripe = getStripe();

  let event;
  try {
    // req.body is a raw Buffer here — express.json() is skipped for this route
    // because signature verification needs the exact bytes Stripe signed.
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook verification failed:", message);
    throw HttpError.badRequest("Webhook tidak terverifikasi", "INVALID_WEBHOOK");
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await settleOrder(event.data.object.id);
      break;
    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      await failOrder(event.data.object.id);
      break;
    default:
      break;
  }

  // Always 200 on a verified event, otherwise Stripe keeps retrying.
  res.json({ received: true });
}

/**
 * Lets the success screen show the real status straight away instead of
 * waiting on webhook delivery, without trusting anything the client says.
 */
export async function getPaymentStatus(req: Request, res: Response) {
  const order = await prisma.order.findFirst({
    where: { id: req.params.orderId, userId: req.userId },
    include: { items: true },
  });
  if (!order) throw HttpError.notFound("Pesanan tidak ditemukan");

  // Webhooks can lag a second or two; ask Stripe directly as a fallback.
  if (order.status === "PENDING" && order.stripePaymentIntentId) {
    try {
      const intent = await getStripe().paymentIntents.retrieve(
        order.stripePaymentIntentId,
      );
      if (intent.status === "succeeded") {
        await settleOrder(order.stripePaymentIntentId);
        order.status = "PAID";
      }
    } catch (err) {
      console.error("Could not reconcile payment intent:", err);
    }
  }

  res.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      items: order.items,
    },
  });
}
