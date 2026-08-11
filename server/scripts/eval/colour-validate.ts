/**
 * Validates the sRGB -> CIE-Lab -> ITA° pipeline in
 * src/modules/scan/scan.colour.ts against its own analytic invariants,
 * rather than against a labelled dataset (there isn't one for skin colour —
 * see docs/RASIONALISASI.md §1.2-1.3).
 *
 * A deterministic formula's "accuracy" question isn't "does it match human
 * judgement" (there's nothing to sample/predict), it's "is the maths
 * actually correct". The checks below are properties the sRGB(D65) -> Lab
 * transform must satisfy BY DEFINITION, independent of any external
 * reference table:
 *
 *   - pure white   -> L*=100, a*=0, b*=0 (exactly, since the sRGB matrix
 *                     rows sum to the D65 white point by construction)
 *   - pure black   -> L*=0,   a*=0, b*=0
 *   - any grey     -> a*=0, b*=0 (equal R=G=B always lands exactly on the
 *                     white point's direction in XYZ, so the a and b chroma
 *                     terms cancel to zero)
 *   - lightness    -> strictly increasing as grey value rises 0..255
 *   - ITA -> depth -> ordering is preserved: a lighter sample must not map
 *                     to a *deeper* Fitzpatrick band than a darker one
 *
 * If this script fails, the colour maths itself is broken - not a model
 * disagreeing with a human, an actual bug.
 *
 * Usage: npx tsx scripts/eval/colour-validate.ts
 */
import {
  computeIta,
  deriveChroma,
  deriveHue,
  deriveValue,
  itaToFitzpatrick,
  labChroma,
  rgbToLab,
  type RGB,
} from "../../src/modules/scan/scan.colour.js";

let failures = 0;

function check(name: string, pass: boolean, detail: string) {
  const mark = pass ? "PASS" : "FAIL";
  console.log(`  ${mark}  ${name.padEnd(46)} ${detail}`);
  if (!pass) failures++;
}

function near(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

console.log("Colour pipeline self-validation (scan.colour.ts)\n");

// --- Exact points -----------------------------------------------------
const white = rgbToLab({ r: 255, g: 255, b: 255 });
check(
  "Pure white -> L*100 a*0 b*0",
  near(white.l, 100, 1e-3) && near(white.a, 0, 1e-3) && near(white.b, 0, 1e-3),
  `got L*${white.l.toFixed(3)} a*${white.a.toFixed(3)} b*${white.b.toFixed(3)}`,
);

const black = rgbToLab({ r: 0, g: 0, b: 0 });
check(
  "Pure black -> L*0 a*0 b*0",
  near(black.l, 0, 1e-3) && near(black.a, 0, 1e-3) && near(black.b, 0, 1e-3),
  `got L*${black.l.toFixed(3)} a*${black.a.toFixed(3)} b*${black.b.toFixed(3)}`,
);

// --- Achromatic axis: every grey must have zero chroma -----------------
const greys = [1, 16, 32, 64, 96, 128, 160, 192, 224, 240, 254];
const greyResults = greys.map((v) => ({ v, lab: rgbToLab({ r: v, g: v, b: v }) }));
const allAchromatic = greyResults.every(
  ({ lab }) => near(lab.a, 0, 1e-3) && near(lab.b, 0, 1e-3),
);
check(
  "Every grey (R=G=B) has a*=b*=0",
  allAchromatic,
  `worst |a*|+|b*| = ${Math.max(
    ...greyResults.map(({ lab }) => Math.abs(lab.a) + Math.abs(lab.b)),
  ).toFixed(4)} across ${greys.length} samples`,
);

// --- Lightness must be monotonic along the grey ramp --------------------
const lSequence = greyResults.map(({ lab }) => lab.l);
const monotonic = lSequence.every((l, i) => i === 0 || l > lSequence[i - 1]);
check(
  "L* strictly increases with grey level",
  monotonic,
  `L* sequence: ${lSequence.map((l) => l.toFixed(1)).join(" < ")}`,
);

// --- ITA -> Fitzpatrick band ordering -----------------------------------
// Synthetic skin-like samples, palest to deepest (not a claimed reference
// dataset - just RGB triples in the range real skin photographs occupy).
const skinSamples: { name: string; rgb: RGB }[] = [
  { name: "very pale", rgb: { r: 245, g: 220, b: 205 } },
  { name: "light", rgb: { r: 225, g: 190, b: 165 } },
  { name: "medium", rgb: { r: 195, g: 150, b: 115 } },
  { name: "tan", rgb: { r: 160, g: 115, b: 85 } },
  { name: "brown", rgb: { r: 120, g: 80, b: 55 } },
  { name: "deep", rgb: { r: 75, g: 48, b: 34 } },
];

const bands = skinSamples.map(({ name, rgb }) => {
  const lab = rgbToLab(rgb);
  const ita = computeIta(lab);
  return { name, ita, band: itaToFitzpatrick(ita) };
});

const nonDecreasing = bands.every(
  (b, i) => i === 0 || b.band >= bands[i - 1].band,
);
check(
  "Palest-to-deepest samples never get a lighter Fitzpatrick band",
  nonDecreasing,
  bands.map((b) => `${b.name}=${b.band}(ITA${b.ita.toFixed(0)})`).join(", "),
);

// --- Sanity: derived hue/value/chroma stay inside their enums -----------
const enumsOk = skinSamples.every(({ rgb }) => {
  const lab = rgbToLab(rgb);
  const hue = deriveHue(lab);
  const value = deriveValue(lab);
  const chroma = deriveChroma(lab);
  return (
    ["warm", "neutral", "cool"].includes(hue) &&
    ["light", "medium", "deep"].includes(value) &&
    ["soft", "medium", "clear"].includes(chroma) &&
    labChroma(lab) >= 0
  );
});
check("Derived hue/value/chroma always land in a valid band", enumsOk, "");

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
