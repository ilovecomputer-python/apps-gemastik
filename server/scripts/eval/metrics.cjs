/**
 * Compute classification metrics for the AI skin scan.
 *
 * Usage: node metrics.cjs <results.jsonl> [outJson]
 *
 * Two views of the same predictions:
 *  1. Single-label: argmax over the five severity scores vs the dataset's
 *     folder label -> confusion matrix, precision/recall/F1, accuracy.
 *  2. Ranking: each class score treated as a confidence -> Average Precision
 *     per class (all-point interpolation, as in sklearn/COCO), mAP = mean AP.
 */
const fs = require("fs");

const CLASSES = ["acne", "blackheads", "dark_spots", "pores", "wrinkles"];

const [, , resultsPath, outPath] = process.argv;
const rows = fs
  .readFileSync(resultsPath, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

if (rows.length === 0) {
  console.error("no results");
  process.exit(1);
}

// ---- predictions -----------------------------------------------------------
for (const r of rows) {
  let best = CLASSES[0];
  for (const c of CLASSES) {
    if ((r.scores[c] ?? 0) > (r.scores[best] ?? 0)) best = c;
  }
  r.pred = best;
  r.ranked = [...CLASSES].sort(
    (a, b) => (r.scores[b] ?? 0) - (r.scores[a] ?? 0),
  );
}

// ---- confusion matrix ------------------------------------------------------
const cm = {};
for (const t of CLASSES) {
  cm[t] = {};
  for (const p of CLASSES) cm[t][p] = 0;
}
for (const r of rows) cm[r.truth][r.pred]++;

// ---- per-class precision / recall / F1 ------------------------------------
const perClass = {};
for (const c of CLASSES) {
  const tp = cm[c][c];
  const fn = CLASSES.reduce((s, p) => s + (p === c ? 0 : cm[c][p]), 0);
  const fp = CLASSES.reduce((s, t) => s + (t === c ? 0 : cm[t][c]), 0);
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  perClass[c] = { tp, fp, fn, precision, recall, f1, support: tp + fn };
}

const correct = rows.filter((r) => r.pred === r.truth).length;
const accuracy = correct / rows.length;
const top2 =
  rows.filter((r) => r.ranked.slice(0, 2).includes(r.truth)).length / rows.length;

const macroPrecision =
  CLASSES.reduce((s, c) => s + perClass[c].precision, 0) / CLASSES.length;
const macroRecall =
  CLASSES.reduce((s, c) => s + perClass[c].recall, 0) / CLASSES.length;
const macroF1 = CLASSES.reduce((s, c) => s + perClass[c].f1, 0) / CLASSES.length;

// ---- Average Precision per class (ranking view) ---------------------------
// AP = Σ (R_n − R_{n−1}) · P_n over the score-sorted list.
function averagePrecision(cls) {
  const scored = rows
    .map((r) => ({ score: r.scores[cls] ?? 0, positive: r.truth === cls }))
    .sort((a, b) => b.score - a.score);

  const totalPositives = scored.filter((s) => s.positive).length;
  if (totalPositives === 0) return { ap: null, curve: [] };

  let tp = 0;
  let fp = 0;
  let prevRecall = 0;
  let ap = 0;
  const curve = [];

  for (const item of scored) {
    if (item.positive) tp++;
    else fp++;
    const precision = tp / (tp + fp);
    const recall = tp / totalPositives;
    ap += (recall - prevRecall) * precision;
    prevRecall = recall;
    curve.push({ precision, recall });
  }
  return { ap, curve };
}

const ap = {};
for (const c of CLASSES) ap[c] = averagePrecision(c).ap;
const validAp = CLASSES.map((c) => ap[c]).filter((v) => v !== null);
const mAP = validAp.reduce((s, v) => s + v, 0) / validAp.length;

// ---- subject / quality diagnostics ----------------------------------------
const subjects = {};
const qualities = {};
for (const r of rows) {
  subjects[r.subject] = (subjects[r.subject] || 0) + 1;
  qualities[r.imageQuality] = (qualities[r.imageQuality] || 0) + 1;
}

/**
 * Wilson score interval. At the sample sizes the free Gemini tier allows, a
 * bare accuracy figure is close to meaningless - the interval is what tells
 * you how much of the number is signal.
 */
function wilson(successes, total, z = 1.96) {
  if (!total) return [0, 0];
  const p = successes / total;
  const d = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return [Math.max(0, (centre - spread) / d), Math.min(1, (centre + spread) / d)];
}

// ---- report ---------------------------------------------------------------
const pct = (v) => (v * 100).toFixed(1) + "%";
const accuracyCI = wilson(correct, rows.length);
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log(`\nSamples evaluated: ${rows.length}`);
console.log(`Model view: argmax of five severity scores vs dataset folder label\n`);

console.log("CONFUSION MATRIX (rows = truth, cols = predicted)");
console.log(
  pad("", 13) + CLASSES.map((c) => padL(c.slice(0, 10), 11)).join("") + padL("total", 8),
);
for (const t of CLASSES) {
  const row = CLASSES.map((p) => padL(cm[t][p], 11)).join("");
  const total = CLASSES.reduce((s, p) => s + cm[t][p], 0);
  console.log(pad(t, 13) + row + padL(total, 8));
}

console.log("\nPER-CLASS METRICS");
console.log(
  pad("class", 13) +
    padL("precision", 11) +
    padL("recall", 9) +
    padL("F1", 8) +
    padL("AP", 8) +
    padL("support", 9),
);
for (const c of CLASSES) {
  const m = perClass[c];
  console.log(
    pad(c, 13) +
      padL(pct(m.precision), 11) +
      padL(pct(m.recall), 9) +
      padL(pct(m.f1), 8) +
      padL(ap[c] === null ? "n/a" : pct(ap[c]), 8) +
      padL(m.support, 9),
  );
}

console.log("\nOVERALL");
console.log(
  `  Accuracy (top-1) : ${pct(accuracy)}  (${correct}/${rows.length})` +
    `  95% CI ${pct(accuracyCI[0])} - ${pct(accuracyCI[1])}`,
);
console.log(`  Accuracy (top-2) : ${pct(top2)}`);
console.log(`  Macro precision  : ${pct(macroPrecision)}`);
console.log(`  Macro recall     : ${pct(macroRecall)}`);
console.log(`  Macro F1         : ${pct(macroF1)}`);
console.log(`  mAP              : ${pct(mAP)}`);
console.log(`  Random baseline  : ${pct(1 / CLASSES.length)} accuracy`);

console.log("\nIMAGE DIAGNOSTICS");
console.log("  subject :", JSON.stringify(subjects));
console.log("  quality :", JSON.stringify(qualities));

if (outPath) {
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        samples: rows.length,
        confusionMatrix: cm,
        perClass,
        averagePrecision: ap,
        overall: {
          accuracy,
          accuracyCI,
          top2Accuracy: top2,
          macroPrecision,
          macroRecall,
          macroF1,
          mAP,
        },
        diagnostics: { subjects, qualities },
      },
      null,
      2,
    ),
  );
  console.log(`\nJSON written to ${outPath}`);
}
