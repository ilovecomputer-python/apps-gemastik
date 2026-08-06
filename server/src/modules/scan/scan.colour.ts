/**
 * Seasonal personal colour analysis.
 *
 * The vision model is deliberately NOT asked to name a season. It only rates
 * three perceptual axes that are actually visible in a photo, and the season
 * is derived here by a fixed table. That keeps the classification auditable:
 * a wrong result can be traced to the axis that was misjudged instead of
 * disappearing into the model.
 *
 * Basis: seasonal colour analysis — Itten's colour theory, developed by
 * Suzanne Caygill, popularised by Carole Jackson (*Color Me Beautiful*, 1980).
 * The 12-season system is the standard expansion of the original four.
 * This is documented industry practice, NOT a labelled-dataset classifier;
 * see docs/RASIONALISASI.md §1.2.
 */

export const HUES = ["warm", "neutral", "cool"] as const;
export const VALUES = ["light", "medium", "deep"] as const;
export const CHROMAS = ["soft", "medium", "clear"] as const;

export type Hue = (typeof HUES)[number];
export type Value = (typeof VALUES)[number];
export type Chroma = (typeof CHROMAS)[number];

export const SEASONS = [
  "light_spring",
  "true_spring",
  "clear_spring",
  "light_summer",
  "true_summer",
  "soft_summer",
  "soft_autumn",
  "true_autumn",
  "deep_autumn",
  "clear_winter",
  "true_winter",
  "deep_winter",
] as const;

export type Season = (typeof SEASONS)[number];

/**
 * hue -> value -> chroma -> season. Every one of the 27 combinations resolves,
 * and all 12 seasons are reachable.
 */
const SEASON_TABLE: Record<Hue, Record<Value, Record<Chroma, Season>>> = {
  warm: {
    light: { soft: "light_spring", medium: "light_spring", clear: "clear_spring" },
    medium: { soft: "soft_autumn", medium: "true_spring", clear: "clear_spring" },
    deep: { soft: "soft_autumn", medium: "true_autumn", clear: "deep_autumn" },
  },
  neutral: {
    light: { soft: "light_summer", medium: "light_spring", clear: "clear_spring" },
    medium: { soft: "soft_summer", medium: "soft_autumn", clear: "clear_winter" },
    deep: { soft: "soft_autumn", medium: "deep_autumn", clear: "deep_winter" },
  },
  cool: {
    light: { soft: "light_summer", medium: "light_summer", clear: "clear_winter" },
    medium: { soft: "soft_summer", medium: "true_summer", clear: "clear_winter" },
    deep: { soft: "soft_summer", medium: "true_winter", clear: "deep_winter" },
  },
};

export function deriveSeason(hue: Hue, value: Value, chroma: Chroma): Season {
  return SEASON_TABLE[hue][value][chroma];
}

export interface SeasonProfile {
  label: string;
  summary: string;
  /** Colour families that flatter this season. */
  palette: string[];
  /** Colour families to approach with care. */
  avoid: string[];
}

export const SEASON_PROFILE: Record<Season, SeasonProfile> = {
  light_spring: {
    label: "Light Spring",
    summary:
      "Warna-warna cerah dan ringan paling menghidupkan wajahmu. Hindari warna yang terlalu pekat karena bisa mendominasi.",
    palette: ["peach", "coral muda", "apricot", "warm pink", "ivory", "mint"],
    avoid: ["hitam pekat", "burgundy gelap", "abu-abu dingin"],
  },
  true_spring: {
    label: "True Spring",
    summary:
      "Warna hangat dan jernih adalah zona amanmu — bayangkan warna-warna yang terasa segar dan penuh cahaya.",
    palette: ["coral", "warm red", "golden yellow", "turquoise", "camel"],
    avoid: ["warna berdebu", "hitam", "dusty rose"],
  },
  clear_spring: {
    label: "Clear Spring",
    summary:
      "Kontras tinggi dan warna jernih cocok untukmu. Warna yang terlalu lembut justru membuat wajah terlihat pudar.",
    palette: ["bright coral", "true red", "emerald", "warm fuchsia", "ivory"],
    avoid: ["warna muted", "beige berdebu"],
  },
  light_summer: {
    label: "Light Summer",
    summary:
      "Warna sejuk yang lembut dan terang paling menyatu dengan kulitmu.",
    palette: ["rose pink", "lavender", "soft blue", "mauve", "cool beige"],
    avoid: ["orange terang", "warna earthy pekat", "hitam"],
  },
  true_summer: {
    label: "True Summer",
    summary:
      "Warna sejuk dengan kelembutan sedang membuat wajahmu terlihat paling seimbang.",
    palette: ["dusty rose", "soft navy", "plum lembut", "cool pink", "grey blue"],
    avoid: ["orange", "kuning keemasan", "warna neon"],
  },
  soft_summer: {
    label: "Soft Summer",
    summary:
      "Warna sejuk yang berdebu dan lembut adalah kekuatanmu. Warna terlalu jernih terasa keras di wajah.",
    palette: ["mauve", "sage", "dusty plum", "soft teal", "taupe"],
    avoid: ["warna neon", "hitam pekat", "orange terang"],
  },
  soft_autumn: {
    label: "Soft Autumn",
    summary:
      "Warna hangat yang lembut dan berdebu paling menyatu — kesannya hangat tapi tidak mencolok.",
    palette: ["terracotta lembut", "sage", "warm taupe", "salmon", "olive"],
    avoid: ["warna neon", "hitam pekat", "pink dingin terang"],
  },
  true_autumn: {
    label: "True Autumn",
    summary:
      "Warna hangat dan kaya seperti rempah dan tanah paling menghidupkan wajahmu.",
    palette: ["terracotta", "mustard", "olive", "brick", "warm brown"],
    avoid: ["pastel dingin", "pink kebiruan", "abu-abu dingin"],
  },
  deep_autumn: {
    label: "Deep Autumn",
    summary:
      "Warna hangat yang pekat dan dalam memberi wajahmu dimensi paling kuat.",
    palette: ["deep brick", "forest green", "chocolate", "deep gold", "burgundy hangat"],
    avoid: ["pastel", "warna berdebu terang"],
  },
  clear_winter: {
    label: "Clear Winter",
    summary:
      "Kontras tinggi dengan warna sejuk dan jernih paling cocok — warna berani justru mengangkat wajahmu.",
    palette: ["true red", "fuchsia", "emerald", "royal blue", "putih bersih"],
    avoid: ["warna berdebu", "beige hangat", "orange"],
  },
  true_winter: {
    label: "True Winter",
    summary:
      "Warna sejuk yang tegas dan dalam membuat fiturmu terlihat paling jelas.",
    palette: ["berry", "true red", "navy", "cool pink", "hitam"],
    avoid: ["orange", "warna earthy hangat", "pastel lembut"],
  },
  deep_winter: {
    label: "Deep Winter",
    summary:
      "Warna sejuk yang pekat adalah kekuatanmu. Warna terlalu terang mudah terlihat pucat di sebelah kulitmu.",
    palette: ["deep berry", "wine", "emerald gelap", "navy pekat", "hitam"],
    avoid: ["pastel", "warna berdebu", "peach terang"],
  },
};

/**
 * Fitzpatrick skin phototype (T.B. Fitzpatrick, 1975) — a dermatological
 * scale, used here to give skin depth a grounded range rather than an
 * invented one. Values run I-VI; we carry them as 1-6.
 */
export const FITZPATRICK_LABEL: Record<number, string> = {
  1: "Sangat terang (Tipe I)",
  2: "Terang (Tipe II)",
  3: "Sedang (Tipe III)",
  4: "Sawo matang (Tipe IV)",
  5: "Cokelat gelap (Tipe V)",
  6: "Sangat gelap (Tipe VI)",
};

const UNDERTONE_LETTER: Record<Hue, string> = {
  warm: "W",
  neutral: "N",
  cool: "C",
};

/**
 * Match a Fitzpatrick depth + undertone against a product's real shade codes.
 *
 * Foundations in this catalogue follow the `N`/`W`/`C` + depth convention
 * (e.g. Make Over Powerstay: N02, W20, C30, N40): the letter is the undertone,
 * the number is depth. Prefer a shade whose letter matches the undertone, then
 * the closest depth; fall back to closest depth alone so a match is still
 * offered when the exact undertone isn't stocked.
 *
 * Returns null for products using descriptive shade names ("Rosy Nude"),
 * which are matched through the seasonal palette instead.
 */
export function matchShadeCode(
  shades: string[],
  hue: Hue,
  fitzpatrick: number,
): { shade: string; exactUndertone: boolean } | null {
  const parsed = shades
    .map((shade) => {
      const m = shade.trim().match(/^([NWC])\s*0*(\d{1,2})$/i);
      if (!m) return null;
      return {
        shade,
        letter: m[1].toUpperCase(),
        // Codes run 02..40-ish; normalise onto the 1-6 Fitzpatrick range.
        depth: Number(m[2]),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (parsed.length === 0) return null;

  // Map the catalogue's depth numbers onto 1-6 by their own min/max, so the
  // match doesn't assume a particular numbering scheme.
  const depths = parsed.map((p) => p.depth);
  const min = Math.min(...depths);
  const max = Math.max(...depths);
  const normalise = (d: number) =>
    max === min ? 3.5 : 1 + ((d - min) / (max - min)) * 5;

  const wanted = UNDERTONE_LETTER[hue];
  const sameUndertone = parsed.filter((p) => p.letter === wanted);
  const pool = sameUndertone.length > 0 ? sameUndertone : parsed;

  const best = pool.reduce((a, b) =>
    Math.abs(normalise(a.depth) - fitzpatrick) <=
    Math.abs(normalise(b.depth) - fitzpatrick)
      ? a
      : b,
  );

  return { shade: best.shade, exactUndertone: sameUndertone.length > 0 };
}
