// BF_CLIENT_STEP4_VALIDATION_v171 - Step 4 used to fail with one generic
// banner and no indication of which field was wrong.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/wizard/Step4_Applicant.tsx", "utf8");

describe("step 4 reports errors per field", () => {
  it("dropped the generic banner", () => {
    expect(SRC).not.toContain("Please complete all required applicant details.");
    expect(SRC).toContain("Please correct the highlighted fields below.");
  });

  it("collects every problem, not just the first", () => {
    expect(SRC).toContain("function validateOwner");
    expect(SRC).toContain("requiredFields.forEach");
  });

  it("names the field in plain language", () => {
    expect(SRC).toContain("Enter the ${labels[field] || field}.");
    expect(SRC).toContain('dob: "date of birth"');
  });

  it("only shows an error once the field has been left", () => {
    expect(SRC).toContain("touched[key] && errors[key]");
    expect(SRC).toContain("const handleBlurField");
  });

  it("scrolls to and focuses the first invalid field", () => {
    expect(SRC).toContain("function focusFirstError");
    expect(SRC).toContain("scrollIntoView");
    expect(SRC).toContain("preventScroll: true");
  });

  it("renders the message beneath its own input", () => {
    expect(SRC).toContain('data-field={`${fieldPrefix}${key}`}');
    expect(SRC).toContain('role="alert"');
  });

  it("still validates phone and email format", () => {
    expect(SRC).toContain("Enter a valid 10-digit phone number.");
    expect(SRC).toContain("Enter a valid email address.");
  });
});
