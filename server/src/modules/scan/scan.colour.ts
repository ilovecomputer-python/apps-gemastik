/**
 * Seasonal personal colour analysis.
 *
 * The vision model is never asked to name a season, nor to judge colour at
 * all. It only locates a clean skin patch in the photo (see scan.vision.ts);
 * the three perceptual axes below are then MEASURED from that patch's actual
 * pixels (see scan.pixels.ts + the colorimetry section further down this
 * file), and the season is derived here by a fixed table. That keeps the
 * whole chain auditable: a wrong result can be traced to a specific measured
 * number, not "the model felt like it".
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

export const UNDERTONE_LABEL: Record<Hue, string> = {
  warm: "Warm Undertone",
  neutral: "Neutral Undertone",
  cool: "Cool Undertone",
};

export const UNDERTONE_ADVICE: Record<Hue, string> = {
  warm: "Pilih foundation dan lipstik berdasar kuning, peach, atau coral.",
  neutral: "Hampir semua shade cocok. Pilih yang paling mendekati warna leher.",
  cool: "Pilih shade berdasar pink, mauve, atau berry untuk hasil paling menyatu.",
};

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
 *
 * The authentic Fitzpatrick scale is itself a self-report sun-reaction
 * questionnaire, not something a photo can measure. What a photo CAN measure
 * is skin colour depth, via ITA° (see the colorimetry section below); we map
 * the computed ITA° onto this same I-VI numbering so the shade-matching table
 * below has one consistent depth scale, rather than inventing a second one.
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

/**
 * Colorimetry: turns a sampled skin-patch pixel colour into the hue/value/
 * chroma/fitzpatrick axes above, by measurement instead of a vision model's
 * free-text opinion.
 *
 * Pipeline: sRGB -> linear RGB -> CIE-XYZ (D65) -> CIE-Lab. All standard,
 * textbook colour-space conversions (see e.g. Fairchild, *Color Appearance
 * Models*), independently checkable — scripts/eval/colour-validate.cjs
 * verifies this file's Lab output against published reference conversions
 * (pure white/black, mid-grey, a handful of standard chart patches).
 *
 * From L*a*b*, two published measures do the rest of the work:
 *
 *  - ITA° (Individual Typology Angle), Chardon, Cretois & Hourseau 1991,
 *    "Skin colour typology and suntanning pathways", Int. J. Cosmetic
 *    Science 13(4). ITA° = atan2(L* - 50, b*) * 180/pi is the standard
 *    INSTRUMENTAL measure of skin colour depth in dermatology/cosmetic
 *    science — the photo-based analogue to the (self-reported) Fitzpatrick
 *    scale. Its published bands are reproduced in `itaToFitzpatrick` below.
 *
 *  - L* itself (lightness) and C*ab = sqrt(a*^2 + b*^2) (chroma) are the
 *    literal Lab-space definitions of this module's "value" and "chroma"
 *    axes — those axis names were not a coincidence even before this file
 *    computed them for real, and now they are the same quantities Lab
 *    already defines, just bucketed into three bands for the season table.
 *
 * Undertone (warm/neutral/cool) uses the Lab hue angle, atan2(b*, a*) — a
 * standard colour-space construct — but the specific degree cut-offs below
 * are a practical choice for the narrow slice of the plane real skin tones
 * occupy, not a single universally-cited constant. Documented as such,
 * honestly, in docs/RASIONALISASI.md §1.2 — same "medium confidence" tier as
 * the season system itself, rather than overclaiming it.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

function srgbChannelToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** D65 reference white, 2-degree observer — the sRGB standard illuminant. */
const D65 = { x: 0.95047, y: 1.0, z: 1.08883 };

function xyzChannelToLab(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

/** sRGB (0-255 per channel) -> CIE-Lab (D65), via linear RGB and XYZ. */
export function rgbToLab({ r, g, b }: RGB): Lab {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  // sRGB -> XYZ, D65 (IEC 61966-2-1).
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;

  const fx = xyzChannelToLab(x / D65.x);
  const fy = xyzChannelToLab(y / D65.y);
  const fz = xyzChannelToLab(z / D65.z);

  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** ITA°, Chardon/Cretois/Hourseau 1991. */
export function computeIta(lab: Lab): number {
  return (Math.atan2(lab.l - 50, lab.b) * 180) / Math.PI;
}

/** Published ITA° bands, re-numbered onto this module's I-VI (1-6) scale. */
export function itaToFitzpatrick(ita: number): number {
  if (ita > 55) return 1; // Very light
  if (ita > 41) return 2; // Light
  if (ita > 28) return 3; // Intermediate
  if (ita > 10) return 4; // Tan
  if (ita > -30) return 5; // Brown
  return 6; // Dark
}

export function labChroma(lab: Lab): number {
  return Math.sqrt(lab.a ** 2 + lab.b ** 2);
}

/** Hue angle in the Lab a*-b* plane, degrees, wrapped to [0, 360). */
export function labHueAngle(lab: Lab): number {
  const deg = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

/** See the module-level colorimetry doc comment re: these cut-offs. */
export function deriveHue(lab: Lab): Hue {
  const angle = labHueAngle(lab);
  if (angle >= 60) return "warm";
  if (angle >= 50) return "neutral";
  return "cool";
}

export function deriveValue(lab: Lab): Value {
  if (lab.l >= 65) return "light";
  if (lab.l >= 45) return "medium";
  return "deep";
}

export function deriveChroma(lab: Lab): Chroma {
  const c = labChroma(lab);
  if (c >= 28) return "clear";
  if (c >= 16) return "medium";
  return "soft";
}
