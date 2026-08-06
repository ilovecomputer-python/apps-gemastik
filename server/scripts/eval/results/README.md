# Evaluation runs so far

Each `results_*.jsonl` holds one model's scores. **Never mix models in one
file** — the metrics assume a single model.

| File | Model | Images | Notes |
| --- | --- | --- | --- |
| `results.jsonl` | `gemini-3.5-flash` | 2 | The model the app ships. Barely started before the daily quota ran out — rerun `run.cjs` against this file to resume. |
| `results_3flash.jsonl` | `gemini-3-flash-preview` | 14 | 78.6% top-1, mAP 87.9% |
| `results_lite.jsonl` | `gemini-3.1-flash-lite` | 16 | 87.5% top-1, mAP 82.7% — the largest run, summarised in `metrics_lite.json` |

**None of these are conclusive.** At n=16 the 95% confidence interval on
accuracy is roughly 64–97%. A quotable figure needs ~30 images per class (150
total), which the Gemini free tier's ~20 requests/day/model cannot deliver
without either billing enabled or several days of partial runs.

`sample.json` is the stratified 150-image sample (seed 42, interleaved across
classes). It is deterministic — `sample.cjs` regenerates it identically — but
is kept here so a resumed run scores exactly the same images.

The images themselves are not stored; re-extract them from the dataset archive
with `extract.cjs`.
