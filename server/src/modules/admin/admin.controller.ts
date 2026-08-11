import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

/**
 * Brand applications awaiting review, newest first. Defaults to PENDING
 * because that is the queue an admin actually works from.
 */
export async function listBrandApplications(req: Request, res: Response) {
  const status = String(req.query.status ?? "PENDING").toUpperCase();
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw HttpError.badRequest("Status tidak valid", "INVALID_STATUS");
  }

  const stores = await prisma.store.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  res.json({
    applications: stores.map((s) => ({
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      story: s.story,
      city: s.city,
      contactName: s.contactName,
      contactEmail: s.contactEmail,
      status: s.status,
      createdAt: s.createdAt,
      productCount: s._count.products,
    })),
  });
}

/** Counts for the queue badge, so the admin sees work waiting without opening it. */
export async function adminSummary(_req: Request, res: Response) {
  const [pending, approved, rejected] = await Promise.all([
    prisma.store.count({ where: { status: "PENDING" } }),
    prisma.store.count({ where: { status: "APPROVED" } }),
    prisma.store.count({ where: { status: "REJECTED" } }),
  ]);
  res.json({ pending, approved, rejected });
}

async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) throw HttpError.notFound("Brand tidak ditemukan");
  if (store.status !== "PENDING") {
    throw HttpError.conflict(
      `Brand ini sudah ${store.status === "APPROVED" ? "disetujui" : "ditolak"}.`,
      "ALREADY_REVIEWED",
    );
  }

  return prisma.store.update({
    where: { id },
    data: {
      status,
      // Approving is what actually publishes the brand, so date the launch
      // from the decision rather than from when the form was submitted.
      ...(status === "APPROVED" ? { launchDate: new Date() } : {}),
    },
  });
}

export async function approveBrand(req: Request, res: Response) {
  const store = await setStatus(req.params.id, "APPROVED");
  res.json({
    brand: { id: store.id, name: store.name, status: store.status },
    message: `${store.name} sekarang tampil di Brand Baru.`,
  });
}

export async function rejectBrand(req: Request, res: Response) {
  const store = await setStatus(req.params.id, "REJECTED");
  res.json({
    brand: { id: store.id, name: store.name, status: store.status },
    message: `Pendaftaran ${store.name} ditolak.`,
  });
}

/**
 * Detaches a store from whoever owns it, without touching its review status
 * or listing. For when a store ends up linked to the wrong account (e.g. a
 * test application submitted through a shared/demo login) and that account
 * shouldn't be treated as that store's seller anymore.
 */
export async function unlinkStoreOwner(req: Request, res: Response) {
  const store = await prisma.store.findUnique({ where: { id: req.params.id } });
  if (!store) throw HttpError.notFound("Brand tidak ditemukan");

  const updated = await prisma.store.update({
    where: { id: req.params.id },
    data: { ownerId: null },
  });

  res.json({ store: { id: updated.id, name: updated.name, ownerId: updated.ownerId } });
}

const updateProductImageSchema = z.object({
  imageUrl: z.string().url("URL gambar tidak valid"),
});

/** Backfills a product photo - covers catalogue items seeded/created without one. */
export async function updateProductImage(req: Request, res: Response) {
  const { imageUrl } = updateProductImageSchema.parse(req.body);
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw HttpError.notFound("Produk tidak ditemukan");

  const updated = await prisma.product.update({
    where: { id: req.params.id },
    data: { imageUrl },
  });

  res.json({ product: { id: updated.id, name: updated.name, imageUrl: updated.imageUrl } });
}
