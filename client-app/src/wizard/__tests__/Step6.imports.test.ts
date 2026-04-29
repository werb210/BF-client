import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("BF_CLIENT_WIZARD_STEP6_IMPORT_v59 — Step 6 contract imports", () => {
  it("imports API_ENDPOINTS_CONTRACT when it references the symbol", () => {
    const src = readFileSync(join(__dirname, "../Step6_Review.tsx"), "utf8");

    if (!src.includes("API_ENDPOINTS_CONTRACT")) {
      return;
    }

    const importRegex =
      /import\s*\{[^}]*\bAPI_ENDPOINTS_CONTRACT\b[^}]*\}\s*from\s*["'][^"']+["']/;
    expect(src).toMatch(importRegex);
  });
});

// BF_CLIENT_WIZARD_STEP6_IMPORT_v59_TEST_ANCHOR
