import type { Category, Product, Store } from "@prisma/client";

const SKIN_TYPES = ["oily", "dry", "combination", "normal", "sensitive"];

const SKIN_TYPE_LABEL: Record<string, string> = {
  oily: "berminyak",
  dry: "kering",
  combination: "kombinasi",
  normal: "normal",
  sensitive: "sensitif",
};

/**
 * Skin condition taxonomy — the same five classes the (now colour-only) scan
 * module's product catalogue already speaks, so a reported concern maps
 * directly onto `Product.concerns[]` instead of a separate vocabulary that
 * needs fuzzy text matching. Self-reported, not photo-detected: see
 * docs/RASIONALISASI.md §1.1 for why condition assessment moved here.
 */
export const SKIN_CONCERNS = [
  "acne",
  "blackheads",
  "dark_spots",
  "pores",
  "wrinkles",
] as const;

export type SkinConcern = (typeof SKIN_CONCERNS)[number];

export const CONCERN_LABEL: Record<SkinConcern, string> = {
  acne: "Jerawat",
  blackheads: "Komedo",
  dark_spots: "Noda hitam",
  pores: "Pori besar",
  wrinkles: "Garis halus",
};

export const CONCERN_ADVICE: Record<SkinConcern, string> = {
  acne: "Pilih produk dengan niacinamide, centella, atau salicylic acid dan hindari menekan jerawat.",
  blackheads:
    "Eksfoliasi lembut dengan BHA 1-2 kali seminggu dan bersihkan wajah dua kali sehari.",
  dark_spots:
    "Gunakan bahan pencerah seperti alpha arbutin atau niacinamide, dan rutin pakai sunscreen.",
  pores:
    "Niacinamide dan eksfoliasi rutin membantu tampilan pori, hindari produk yang menyumbat pori.",
  wrinkles:
    "Retinol pada malam hari dan pelembap kaya antioksidan membantu menyamarkan garis halus.",
};

function isSkinConcern(tag: string): tag is SkinConcern {
  return (SKIN_CONCERNS as readonly string[]).includes(tag);
}

export interface ConcernDetail {
  key: SkinConcern;
  label: string;
  advice: string;
}

export interface SkinProfile {
  skinType: string;
  skinTypeLabel: string;
  concerns: SkinConcern[];
  concernLabels: string[];
  /** Concern + label + advice, ready to render without a lookup table. */
  concernDetails: ConcernDetail[];
  newBrandOk: boolean;
  categoryPref: Category | null;
  budget: "budget-low" | "budget-mid" | "budget-high";
}

export function buildSkinProfile(tags: string[]): SkinProfile {
  const skinType = tags.find((t) => SKIN_TYPES.includes(t)) ?? "normal";
  const concerns = tags.filter(isSkinConcern);
  const newBrandOk = !tags.includes("new-brand-no");
  const focusMakeup = tags.includes("focus-makeup");
  const focusSkincare = tags.includes("focus-skincare");
  const categoryPref: Category | null =
    focusMakeup && !focusSkincare
      ? "MAKEUP"
      : focusSkincare && !focusMakeup
        ? "SKINCARE"
        : null;
  const budget =
    (tags.find((t) => t.startsWith("budget-")) as SkinProfile["budget"]) ??
    "budget-mid";

  return {
    skinType,
    skinTypeLabel: SKIN_TYPE_LABEL[skinType] ?? skinType,
    concerns,
    concernLabels: concerns.map((c) => CONCERN_LABEL[c]),
    concernDetails: concerns.map((c) => ({
      key: c,
      label: CONCERN_LABEL[c],
      advice: CONCERN_ADVICE[c],
    })),
    newBrandOk,
    categoryPref,
    budget,
  };
}

type ProductWithStore = Product & { store: Store };

export function pickKitProducts(
  products: ProductWithStore[],
  profile: SkinProfile,
  take = 4,
) {
  const scored = products.map((product) => {
    let score = product.rating;
    if (profile.categoryPref && product.category === profile.categoryPref) {
      score += 2;
    }
    if (profile.newBrandOk && product.store.isNewBrand) score += 3;
    if (product.umkm) score += 1;

    // Structured match against the product's own concerns[], the same field
    // the (now colour-only) scan module's makeup matching reads - not a
    // fuzzy text search over description/hashtags.
    const matchedConcerns = product.concerns.filter((c): c is SkinConcern =>
      profile.concerns.includes(c as SkinConcern),
    );
    score += matchedConcerns.length * 2;

    if (profile.budget === "budget-low" && product.price <= 60000) score += 1;
    if (profile.budget === "budget-high" && product.price >= 100000) score += 1;

    return { product, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, take);
}

export function reasonForPick(
  product: ProductWithStore,
  profile: SkinProfile,
): string {
  const parts: string[] = [];
  if (profile.newBrandOk && product.store.isNewBrand) {
    parts.push("produk dari brand baru yang lagi kami dorong");
  }
  if (profile.concernLabels.length) {
    parts.push(`bantu masalah ${profile.concernLabels.join(", ")}`);
  }
  parts.push(`sesuai kulit ${profile.skinTypeLabel}`);
  return `Direkomendasikan karena ${parts.join(", ")}.`;
}
