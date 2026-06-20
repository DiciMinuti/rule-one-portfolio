#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQualitativeBrief } from "./schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const briefsDir = path.join(rootDir, "src/lib/data/qualitative/briefs");

const files = (await readdir(briefsDir))
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .sort();
let failed = false;

for (const file of files) {
  const filePath = path.join(briefsDir, file);
  const brief = JSON.parse(await readFile(filePath, "utf8"));
  const errors = validateQualitativeBrief(brief);

  if (errors.length) {
    failed = true;
    console.error(`${path.relative(rootDir, filePath)} failed validation:\n- ${errors.join("\n- ")}`);
  } else {
    console.log(`${brief.symbol}: valid`);
  }
}

if (failed) {
  process.exit(1);
}
