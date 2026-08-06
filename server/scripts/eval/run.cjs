/**
 * Run the production skin-scan prompt over a sampled set of dataset images and
 * record the raw 0-100 scores for every class.
 *
 * Usage: node run.cjs <sample.json> <imagesDir> <out.jsonl> [model]
 *
 * Appends one JSON line per image so a quota failure part-way through still
 * leaves usable results. Re-running skips images already present in out.jsonl.
 */
const fs = require("fs");
const path = require("path");

const [, , samplePath, imagesDir, outPath, modelArg] = process.argv;
const MODEL = modelArg || "gemini-3.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const CONCERNS = ["acne", "blackheads", "dark_spots", "pores", "wrinkles"];

// Mirrors server/src/modules/scan/scan.vision.ts so the eval measures what the
// app actually ships.
const SYSTEM_INSTRUCTION = [
  "Kamu adalah asisten analisis kecantikan untuk marketplace skincare Indonesia.",
  "Tugasmu menilai tampilan kulit wajah secara KOSMETIK, bukan diagnosis medis.",
  "Jangan pernah menyebut nama penyakit, jangan memberi saran pengobatan medis.",
  "Isi field subject dengan: 'face' jika terlihat wajah manusia,",
  "'skin_closeup' jika foto makro kulit manusia tanpa wajah utuh,",
  "atau 'other' jika gambar bukan kulit manusia sama sekali.",
  "Jika subject='other', jangan mengarang penilaian apa pun.",
  "Tulis field notes dalam Bahasa Indonesia yang ramah, maksimal 2 kalimat.",
].join(" ");

const PROMPT = [
  "Analisis kondisi kulit wajah pada foto ini.",
  "Beri skor 0-100 untuk setiap kondisi berikut berdasarkan seberapa terlihat pada wajah:",
  "- acne: jerawat aktif, bruntusan, kemerahan meradang",
  "- blackheads: komedo hitam/putih, terutama area hidung dan dagu",
  "- dark_spots: noda hitam, bekas jerawat, hiperpigmentasi tidak merata",
  "- pores: pori-pori yang terlihat membesar",
  "- wrinkles: garis halus dan kerutan",
  "Skor 0 berarti tidak terlihat sama sekali, 100 berarti sangat dominan.",
  "Tentukan juga tipe kulit dari tampilan minyak dan teksturnya.",
].join("\n");

const responseSchema = {
  type: "OBJECT",
  properties: {
    subject: { type: "STRING", enum: ["face", "skin_closeup", "other"] },
    imageQuality: { type: "STRING", enum: ["good", "fair", "poor"] },
    notes: { type: "STRING" },
    skinType: {
      type: "STRING",
      enum: ["oily", "dry", "combination", "normal", "sensitive"],
    },
    conditions: {
      type: "OBJECT",
      properties: Object.fromEntries(
        CONCERNS.map((c) => [c, { type: "INTEGER" }]),
      ),
      required: CONCERNS,
    },
  },
  required: ["subject", "imageQuality", "notes", "skinType", "conditions"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function analyse(b64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: "image/jpeg", data: b64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(60000),
    },
  );
  const json = await res.json();
  if (json.error) {
    const err = new Error(json.error.message);
    err.code = json.error.code;
    err.status = json.error.status;
    throw err;
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  return JSON.parse(text);
}

(async () => {
  const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));

  const done = new Set();
  if (fs.existsSync(outPath)) {
    for (const line of fs.readFileSync(outPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        done.add(JSON.parse(line).file);
      } catch {}
    }
  }

  let ok = 0;
  let failed = 0;
  for (const [i, item] of sample.entries()) {
    if (done.has(item.file)) continue;

    const localName = item.file.split("/").pop();
    const imgPath = path.join(imagesDir, localName);
    if (!fs.existsSync(imgPath)) {
      console.error(`missing image: ${localName}`);
      failed++;
      continue;
    }

    const b64 = fs.readFileSync(imgPath).toString("base64");
    try {
      const result = await analyse(b64);
      fs.appendFileSync(
        outPath,
        JSON.stringify({
          file: item.file,
          truth: item.cls,
          subject: result.subject,
          imageQuality: result.imageQuality,
          skinType: result.skinType,
          scores: result.conditions,
        }) + "\n",
      );
      ok++;
      process.stdout.write(
        `[${i + 1}/${sample.length}] ${item.cls.padEnd(11)} ok\n`,
      );
    } catch (err) {
      if (/RESOURCE_EXHAUSTED|quota/i.test(err.message)) {
        console.error(`\nQUOTA EXHAUSTED after ${ok} successful calls.`);
        console.error(err.message.split("\n")[0]);
        break;
      }
      failed++;
      console.error(`[${i + 1}] ${item.cls} FAILED: ${err.message.slice(0, 120)}`);
      await sleep(2000);
    }
    await sleep(1200); // stay under per-minute limits
  }

  console.log(`\ndone: ${ok} ok, ${failed} failed, results in ${outPath}`);
})();
