import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// BF_CLIENT_DOCPICKER_MULTIFILE_v1 - guards that the CMP "Upload Documents"
// picker stays multi-file: the input is created with `multiple` and every
// selected file is uploaded (loop), not just files[0].
const src = readFileSync(
  join(process.cwd(), "src/components/DocPicker.tsx"),
  "utf-8",
);

describe("DocPicker multi-file picker", () => {
  it("marks the file input as multiple", () => {
    expect(src).toContain("input.multiple = true;");
  });
  it("uploads every selected file, not just the first", () => {
    expect(src).toContain("Array.from(input.files");
    expect(src).toContain("for (const file of files)");
    expect(src).not.toContain("const file = input.files?.[0];");
  });
});
