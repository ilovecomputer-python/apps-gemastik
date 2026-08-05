import type { Category, Product, Store } from "@prisma/client";

const SKIN_TYPES = ["oily", "dry", "combination", "normal", "sensitive"];
const CONCERN_TAGS = ["acne", "dull", "pores", "aging", "dehydration"];

const SKIN_LABEL: Record<string, string> = {
  oily: "berminyak",
  dry: "kering",
  combination: "kombinasi",
  normal: "normal",
  sensitive: "sensitif",
};

const CONCERN_LABEL: Record<string, string> = {
  acne: "jerawat",
  dull: "kulit kusam",
  pores: "pori besar",
  aging: "tanda penuaan",
  dehydration: "dehidrasi",
};

const CONCERN_KEYWORDS: Record<string, string[]> = {
  acne: ["jerawat", "minyak berlebih", "pori"],
  dull: ["kusam", "cerah", "glow", "bright"],
  pores: ["pori"],
  aging: ["penuaan", "anti-aging", "kerut"],
  dehydration: ["lembap", "hidrasi", "kering"],
};

export interface SkinProfile {
  skinType: string;
  skinTypeLabel: string;
  concerns: string[];
  concernLabels: string[];
  newBrandOk: boolean;
  categoryPref: Category | null;
  budget: "budget-low" | "budget-mid" | "budget-high";
}

export function buildSkinProfile(tags: string[]): SkinProfile {
  const skinType = tags.find((t) => SKIN_TYPES.includes(t)) ?? "normal";
  const concerns = tags.filter((t) => CONCERN_TAGS.includes(t));
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
    skinTypeLabel: SKIN_LABEL[skinType] ?? skinType,
    concerns,
    concernLabels: concerns.map((c) => CONCERN_LABEL[c] ?? c),
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

    const textBlob = `${product.description} ${product.hashtags.join(" ")}`.toLowerCase();
    for (const concern of profile.concerns) {
      const keywords = CONCERN_KEYWORDS[concern] ?? [];
      if (keywords.some((kw) => textBlob.includes(kw))) score += 2;
    }

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
