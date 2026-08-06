/**
 * Build a stratified, deterministic sample of the Skin v2 dataset.
 * Usage: node sample.cjs <ziplist.txt> <perClass> <outJson> [seed]
 */
const fs = require("fs");

const [, , listPath, perClassArg, outPath, seedArg] = process.argv;
const perClass = Number(perClassArg);
const seed = Number(seedArg ?? 42);

// Deterministic PRNG so the sample is reproducible.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLASS_MAP = {
  acne: "acne",
  blackheades: "blackheads",
  "dark spots": "dark_spots",
  pores: "pores",
  wrinkles: "wrinkles",
};

const byClass = {};
for (const line of fs.readFileSync(listPath, "utf8").split("\n")) {
  const m = line.match(/^\s*(\d+)\s+\S+\s+\S+\s+(Skin v2\/[^/]+\/.+)$/);
  if (!m) continue;
  const size = Number(m[1]);
  const p = m[2].trim();
  // Skip thumbnails/degenerate files; they are not representative photos.
  if (size < 15000) continue;
  const folder = p.split("/")[1];
  const cls = CLASS_MAP[folder];
  if (!cls) continue;
  (byClass[cls] ||= []).push(p);
}

const rng = mulberry32(seed);
const picked = {};
for (const cls of Object.keys(byClass).sort()) {
  const files = byClass[cls].slice().sort();
  // Fisher-Yates with the seeded PRNG.
  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [files[i], files[j]] = [files[j], files[i]];
  }
  picked[cls] = files.slice(0, perClass);
}

// Interleave round-robin across classes: if the API quota runs out part-way
// through, the completed subset is still balanced rather than all-acne.
const sample = [];
const classes = Object.keys(picked).sort();
for (let i = 0; i < perClass; i++) {
  for (const cls of classes) {
    if (picked[cls][i]) sample.push({ cls, file: picked[cls][i] });
  }
}

fs.writeFileSync(outPath, JSON.stringify(sample, null, 2));
const counts = {};
sample.forEach((s) => (counts[s.cls] = (counts[s.cls] || 0) + 1));
console.log("sampled:", JSON.stringify(counts), "total:", sample.length);
