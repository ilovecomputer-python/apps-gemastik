import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

export async function listShippingOptions(_req: Request, res: Response) {
  const options = await prisma.shippingOption.findMany({
    orderBy: { price: "asc" },
  });
  res.json({ shippingOptions: options });
}

export async function listPaymentMethods(_req: Request, res: Response) {
  const methods = await prisma.paymentMethod.findMany({
    orderBy: { groupName: "asc" },
  });
  res.json({
    paymentMethods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      group: m.groupName,
    })),
  });
}
