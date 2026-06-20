#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQualitativeBrief } from "./schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const briefsDir = path.join(rootDir, "src/lib/data/qualitative/briefs");
const indexPath = path.join(briefsDir, "index.json");

export async function rebuildBriefIndex() {
  const files = (await readdir(briefsDir))
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .sort();
  const index = {};

  for (const file of files) {
    const filePath = path.join(briefsDir, file);
    const brief = JSON.parse(await readFile(filePath, "utf8"));
    const errors = validateQualitativeBrief(brief);

    if (errors.length) {
      throw new Error(`${path.relative(rootDir, filePath)} failed validation:\n- ${errors.join("\n- ")}`);
    }

    index[brief.symbol] = brief;
  }

  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Indexed ${Object.keys(index).length} qualitative brief(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await rebuildBriefIndex();
}
