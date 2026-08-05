import type { Category, Product, Store } from "@prisma/client";

const CATEGORY_LABEL: Record<Category, string> = {
  SKINCARE: "Skincare",
  MAKEUP: "Makeup",
  BODYCARE: "Bodycare",
};

type ProductWithStore = Product & { store: Store };

export function toPublicProduct(product: ProductWithStore) {
  return {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    rating: product.rating,
    soldCount: product.soldCount,
    category: CATEGORY_LABEL[product.category],
    halal: product.halal,
    umkm: product.umkm,
    storeName: product.store.name,
    storeRating: product.store.rating,
    description: product.description,
    hashtags: product.hashtags,
    shades: product.shades,
    concerns: product.concerns,
    color: product.color,
  };
}

export const CATEGORY_FROM_LABEL: Record<string, Category> = {
  Skincare: "SKINCARE",
  Makeup: "MAKEUP",
  Bodycare: "BODYCARE",
};
