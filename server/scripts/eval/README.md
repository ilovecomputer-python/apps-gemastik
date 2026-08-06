# AI Scan accuracy evaluation

Measures the skin-scan vision pipeline against the labelled **Skin v2** dataset
(one folder per class: `acne`, `blackheades`, `dark spots`, `pores`,
`wrinkles`).

The runner reuses the exact system instruction, prompt, response schema, and
temperature that `src/modules/scan/scan.vision.ts` ships, so the numbers
describe the deployed behaviour rather than a lab-only variant.

## How the metrics are defined

The model returns five severity scores (0-100) per image; the dataset gives one
label per image. Two complementary views:

1. **Single-label classification** — take `argmax` of the five scores as the
   prediction. Yields the confusion matrix, per-class precision / recall / F1,
   and top-1 / top-2 accuracy.
2. **Ranking** — treat each class's score as a confidence and rank every image
   by it. Yields Average Precision per class (all-point interpolation, as in
   scikit-learn / COCO); **mAP** is the mean AP across the five classes.

The ranking view matters because skin conditions co-occur: a face labelled
`acne` frequently also shows real `dark_spots`. Argmax punishes that; AP does
not.

## Running

```bash
# 1. Stratified, deterministic sample (interleaved across classes, so a partial
#    run stays balanced if the API quota runs out)
node sample.cjs ziplist.txt 30 sample.json 42

# 2. Pull those images out of the dataset archive
node extract.cjs sample.json /path/to/archive.zip images

# 3. Score them (appends JSONL; re-running resumes where it stopped)
GEMINI_API_KEY=... node run.cjs sample.json images results.jsonl gemini-3.5-flash

# 4. Metrics
node metrics.cjs results.jsonl metrics.json
```

`ziplist.txt` is `unzip -l archive.zip > ziplist.txt`.

## Quota

The Gemini **free tier caps requests per day per model** (~20/day on the
Gemini 3.x family). A 150-image run therefore needs either billing enabled on
the Google Cloud project or several days of partial runs. `run.cjs` stops
cleanly on `RESOURCE_EXHAUSTED` and keeps everything scored so far, so you can
resume the next day against the same `results.jsonl`.

Never mix models in one `results.jsonl` — each file must describe a single
model for the metrics to mean anything.
