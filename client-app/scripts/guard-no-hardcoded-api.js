#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const CHECKS = [
  {
    label: "Disallowed localhost backend URL (8080)",
    pattern: "http://localhost:8080",
    args: ["--hidden", "--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist", "--glob", "!scripts/guard-no-hardcoded-api.js", "."],
  },
  {
    label: "Disallowed localhost backend URL (3000)",
    pattern: "http://localhost:3000",
    args: ["--hidden", "--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist", "--glob", "!scripts/guard-no-hardcoded-api.js", "."],
  },
  {
    label: "Hardcoded VITE_API_URL value",
    pattern: "VITE_API_URL\\s*=\\s*https?://",
    args: ["--hidden", "--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist", "--glob", "!scripts/guard-no-hardcoded-api.js", "."],
  },
  {
    label: "Hardcoded API URL in fetch",
    pattern: "fetch\\(\\s*[\"']https?://",
    args: ["src"],
  },
];

function runRg(pattern, args) {
  const result = spawnSync("rg", ["-n", "-P", pattern, ...args], {
    encoding: "utf8",
  });

  if (result.status === 1) {
    return "";
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to run rg for API guard");
  }

  return result.stdout;
}

const violations = CHECKS.flatMap((check) => {
  const output = runRg(check.pattern, check.args).trim();
  if (!output) {
    return [];
  }

  return `${check.label}:\n${output}`;
});

if (violations.length > 0) {
  console.error("[HARD-CODED API GUARD] Violations detected:\n");
  console.error(violations.join("\n\n"));
  process.exit(1);
}

console.log("[HARD-CODED API GUARD] OK");
