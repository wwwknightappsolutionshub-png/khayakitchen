import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildId = readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();
const outputPath = path.join(root, "public", "app-version.json");

writeFileSync(
  outputPath,
  `${JSON.stringify({ build: buildId, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${outputPath} (build: ${buildId})`);
