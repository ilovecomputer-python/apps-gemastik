import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { toPublicProduct } from "../products/products.serializer.js";
import { brandApplicationSchema } from "./brands.schema.js";
import { HttpError } from "../../lib/http-error.js";

export async function listSpotlightBrands(_req: Request, res: Response) {
  const stores = await prisma.store.findMany({
    // Applications waiting on review must not appear to shoppers.
    where: { isNewBrand: true, status: "APPROVED" },
    include: { products: { include: { store: true } } },
    orderBy: { launchDate: "desc" },
  });

  res.json({
    brands: stores.map((store) => ({
      id: store.id,
      name: store.name,
      rating: store.rating,
      tagline: store.tagline,
      story: store.story,
      launchDate: store.launchDate,
      products: store.products.map(toPublicProduct),
    })),
  });
}

/**
 * Brand on-boarding.
 *
 * Until now `isNewBrand` could only be set by the seed script, so the
 * "Hub UMKM Digital" claim on the home page had no way to actually take on a
 * brand. An application lands as PENDING and stays invisible to shoppers until
 * someone reviews it — self-serve listing would let anyone publish a storefront.
 */
export async function applyAsBrand(req: Request, res: Response) {
  const input = brandApplicationSchema.parse(req.body);

  const existing = await prisma.store.findFirst({
    where: { name: { equals: input.name, mode: "insensitive" } },
  });
  if (existing) {
    throw HttpError.conflict(
      "Nama brand ini sudah terdaftar. Hubungi kami jika ini brand-mu.",
      "BRAND_NAME_TAKEN",
    );
  }

  // One brand per account keeps the Seller Center unambiguous about which
  // store it is showing.
  const alreadyOwns = await prisma.store.findFirst({
    where: { ownerId: req.userId },
  });
  if (alreadyOwns) {
    throw HttpError.conflict(
      "Kamu sudah punya brand terdaftar di akun ini.",
      "ALREADY_HAS_STORE",
    );
  }

  const store = await prisma.store.create({
    data: {
      name: input.name,
      tagline: input.tagline,
      story: input.story,
      city: input.city,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      isNewBrand: true,
      status: "PENDING",
      // Ownership is what gives the applicant a Seller Center to come back to.
      ownerId: req.userId,
    },
  });

  res.status(201).json({
    application: {
      id: store.id,
      name: store.name,
      status: store.status,
    },
    message:
      "Pendaftaran diterima. Tim kami akan meninjau dan menghubungi emailmu dalam 3 hari kerja.",
  });
}
