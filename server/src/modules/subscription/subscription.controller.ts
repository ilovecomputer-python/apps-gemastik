import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { subscribeSchema } from "./subscription.schema.js";

const subscriptionInclude = {
  plan: true,
  trialKits: { include: { items: true }, orderBy: { createdAt: "desc" as const } },
};

function currentPeriodLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

async function buildTrialKitItems() {
  const partnerProducts = await prisma.product.findMany({
    where: { umkm: true },
    orderBy: { rating: "desc" },
    take: 3,
  });

  let items = partnerProducts;
  if (items.length < 3) {
    const fillers = await prisma.product.findMany({
      where: { id: { notIn: items.map((p) => p.id) } },
      orderBy: { rating: "desc" },
      take: 3 - items.length,
    });
    items = [...items, ...fillers];
  }

  return items.map((p) => ({
    brand: p.brand,
    name: p.name,
    note: "Ukuran sampel 5-10ml, gratis dari brand partner",
    color: p.color,
  }));
}

export async function listPlans(_req: Request, res: Response) {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { price: "asc" } });
  res.json({ plans });
}

export async function getMySubscription(req: Request, res: Response) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: req.userId },
    include: subscriptionInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ subscription });
}

export async function subscribe(req: Request, res: Response) {
  const input = subscribeSchema.parse(req.body);
  const userId = req.userId!;

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: input.planId },
  });
  if (!plan) throw HttpError.notFound("Paket langganan tidak ditemukan");

  const existingActive = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (existingActive) {
    throw HttpError.conflict(
      "Kamu sudah berlangganan AURA+",
      "ALREADY_SUBSCRIBED",
    );
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const trialKitItems = await buildTrialKitItems();

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      currentPeriodEnd: periodEnd,
      trialKits: {
        create: {
          periodLabel: currentPeriodLabel(now),
          status: "PROCESSING",
          items: { create: trialKitItems },
        },
      },
    },
    include: subscriptionInclude,
  });

  res.status(201).json({ subscription });
}

export async function cancelSubscription(req: Request, res: Response) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: req.userId, status: "ACTIVE" },
  });
  if (!subscription) {
    throw HttpError.notFound("Kamu belum berlangganan AURA+");
  }

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: subscriptionInclude,
  });

  res.json({ subscription: updated });
}
