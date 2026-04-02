#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const command = String.raw`localhost|127\.0\.0\.1|0\.0\.0\.0|window\.location\.origin|process\.env\..*API`;
const result = spawnSync("rg", ["-n", command, "src"], { encoding: "utf8" });

if (result.status === 0) {
  console.error("[HARD-CODED API GUARD] Violations detected:");
  console.error(result.stdout.trim());
  process.exit(1);
}

if (result.status === 1) {
  console.log("[HARD-CODED API GUARD] OK");
  process.exit(0);
}

throw new Error(result.stderr || "Failed to run hard-coded API guard");
