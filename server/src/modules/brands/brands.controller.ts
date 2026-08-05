import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { toPublicProduct } from "../products/products.serializer.js";

export async function listSpotlightBrands(_req: Request, res: Response) {
  const stores = await prisma.store.findMany({
    where: { isNewBrand: true },
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
