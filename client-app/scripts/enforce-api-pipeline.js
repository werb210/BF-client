#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(query) {
  try {
    return execSync(query, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const stderr = (error.stderr || "").toString().trim();
    if (stderr) {
      throw new Error(stderr);
    }
    return (error.stdout || "").toString().trim();
  }
}

const directNetwork = run(
  "rg -n \"\\bfetch\\(|\\baxios\\(|\\bXMLHttpRequest\\b\" src --glob '!**/__tests__/**' --glob '!**/*.test.*' --glob '!src/lib/api.ts'"
);

if (directNetwork) {
  console.error("[API PIPELINE BLOCK] Direct network call detected:\n" + directNetwork);
  process.exit(1);
}

const apiRequestCalls = run(
  "rg -n \"apiRequest\\(\\s*['\\\"][^'\\\"]+\" src --glob '!**/__tests__/**' --glob '!**/*.test.*'"
);

const invalid = apiRequestCalls
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !line.includes("apiRequest(\"/api/") && !line.includes("apiRequest('/api/"));

if (invalid.length > 0) {
  console.error("[API PIPELINE BLOCK] apiRequest path must start with /api/:\n" + invalid.join("\n"));
  process.exit(1);
}

console.log("[API PIPELINE OK]");
