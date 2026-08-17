// BF_CLIENT_CHROME_v170 - BF-Website's header/footer are the template. These
// assert the shared geometry so a link cannot drift a few pixels between
// properties without a test going red.
import { describe, it, expect } from "vitest";
import fs from "fs";

const HEADER = fs.readFileSync("src/components/landing/LandingHeader.tsx", "utf8");
const CONTAINER = fs.readFileSync("src/styles/container.css", "utf8");

describe("header geometry matches the template", () => {
  it("uses the shared container, not Tailwind's 1280px box", () => {
    expect(HEADER).toContain("bf-container");
    expect(HEADER).not.toContain("max-w-7xl");
  });

  it("keeps the template's 80px header row", () => {
    expect(HEADER).toContain("min-h-20");
  });

  it("container is 1120px with 24px padding, matching global.css", () => {
    expect(CONTAINER).toContain("max-width: 1120px");
    expect(CONTAINER).toContain("padding: 0 24px");
  });
});
