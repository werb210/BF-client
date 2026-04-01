#!/usr/bin/env node
import { execSync } from "node:child_process";

function hasMatches(query) {
  try {
    execSync(query, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

if (
  hasMatches(
    'grep -R "fetch(" src | grep -v "src/lib/api.ts" | grep -v "src/lib/upload.ts" | grep -v "src/main.tsx" | grep -v "src/__tests__/integration.test.ts"'
  )
) {
  console.error("[API PIPELINE BLOCK] Direct fetch usage outside API layer detected.");
  process.exit(1);
}

if (hasMatches('grep -R "axios(" src')) {
  console.error("[API PIPELINE BLOCK] axios usage detected.");
  process.exit(1);
}

if (hasMatches('grep -R "XMLHttpRequest" src')) {
  console.error("[API PIPELINE BLOCK] XMLHttpRequest usage detected.");
  process.exit(1);
}

console.log("[API PIPELINE OK]");
