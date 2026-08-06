/**
 * Skin condition taxonomy.
 *
 * These five classes mirror the labelled training dataset ("Skin v2"), which
 * is organised as one folder per class: acne, blackheades, dark spots, pores,
 * wrinkles. The vision model is constrained to score exactly these classes so
 * its output stays comparable to the dataset's labels, and so every condition
 * maps cleanly onto Product.concerns in the catalogue.
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

/** Advice shown per condition when it is detected above the noticeable threshold. */
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

export const SKIN_TYPES = [
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
] as const;

export type SkinType = (typeof SKIN_TYPES)[number];

export const SKIN_TYPE_LABEL: Record<SkinType, string> = {
  oily: "berminyak",
  dry: "kering",
  combination: "kombinasi",
  normal: "normal",
  sensitive: "sensitif",
};

export const UNDERTONES = ["warm", "neutral", "cool"] as const;
export type Undertone = (typeof UNDERTONES)[number];

export const UNDERTONE_LABEL: Record<Undertone, string> = {
  warm: "Warm Undertone",
  neutral: "Neutral Undertone",
  cool: "Cool Undertone",
};

export const DEPTHS = ["fair", "light", "medium", "tan", "deep"] as const;
export type Depth = (typeof DEPTHS)[number];

export const DEPTH_LABEL: Record<Depth, string> = {
  fair: "sangat terang",
  light: "terang",
  medium: "sedang",
  tan: "sawo matang",
  deep: "gelap",
};

export const UNDERTONE_ADVICE: Record<Undertone, string> = {
  warm: "Pilih foundation dan lipstik berdasar kuning, peach, atau coral.",
  neutral: "Hampir semua shade cocok. Pilih yang paling mendekati warna leher.",
  cool: "Pilih shade berdasar pink, mauve, atau berry untuk hasil paling menyatu.",
};

/** Severity at or above this is surfaced to the user as a real finding. */
export const NOTICEABLE_THRESHOLD = 30;

export function severityLabel(score: number): string {
  if (score >= 65) return "Tinggi";
  if (score >= NOTICEABLE_THRESHOLD) return "Sedang";
  return "Rendah";
}
