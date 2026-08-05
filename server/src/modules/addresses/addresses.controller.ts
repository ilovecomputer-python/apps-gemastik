import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { createAddressSchema } from "./addresses.schema.js";

export async function listAddresses(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({
    where: { userId: req.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  res.json({ addresses });
}

export async function createAddress(req: Request, res: Response) {
  const input = createAddressSchema.parse(req.body);

  const existingCount = await prisma.address.count({
    where: { userId: req.userId },
  });
  const shouldBeDefault = input.isDefault || existingCount === 0;

  if (shouldBeDefault) {
    await prisma.address.updateMany({
      where: { userId: req.userId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId: req.userId!,
      label: input.label,
      recipient: input.recipient,
      phone: input.phone,
      fullAddress: input.fullAddress,
      isDefault: shouldBeDefault,
    },
  });

  res.status(201).json({ address });
}

export async function deleteAddress(req: Request, res: Response) {
  const address = await prisma.address.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!address) {
    throw HttpError.notFound("Alamat tidak ditemukan");
  }

  await prisma.address.delete({ where: { id: address.id } });
  res.json({ ok: true });
}
