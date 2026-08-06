/** Extract the sampled images out of the dataset zip. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const [, , samplePath, zipPath, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const listFile = path.join(outDir, "_files.txt");
fs.writeFileSync(listFile, sample.map((s) => s.file).join("\n"));

// unzip in batches: one process per file is far too slow for 150 files
const BATCH = 25;
let extracted = 0;
for (let i = 0; i < sample.length; i += BATCH) {
  const batch = sample.slice(i, i + BATCH).map((s) => s.file);
  execFileSync("unzip", ["-j", "-o", zipPath, ...batch, "-d", outDir], {
    stdio: "ignore",
  });
  extracted += batch.length;
  process.stdout.write(`extracted ${extracted}/${sample.length}\r`);
}

const present = sample.filter((s) =>
  fs.existsSync(path.join(outDir, s.file.split("/").pop())),
).length;
console.log(`\n${present}/${sample.length} images available in ${outDir}`);
