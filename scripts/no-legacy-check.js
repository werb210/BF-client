#!/usr/bin/env node
const { execSync } = require("node:child_process");

const blockedPatterns = [
  "\\bhandleApi\\s*\\(",
  "try \\{ await api",
  "catch \\(e\\)",
];

let hasViolation = false;

for (const pattern of blockedPatterns) {
  try {
    const output = execSync(`rg -n "${pattern}" src client-app/src`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    if (output) {
      hasViolation = true;
      console.error(`Legacy pattern detected: ${pattern}`);
      console.error(output);
    }
  } catch (error) {
    if (error.status !== 1) {
      throw error;
    }
  }
}

if (hasViolation) {
  process.exit(1);
}

console.log("No legacy API patterns detected.");
