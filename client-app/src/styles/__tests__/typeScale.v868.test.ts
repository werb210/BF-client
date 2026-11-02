// BF_CLIENT_v868_READABLE_TYPE - the small text sizes come from one scale (theme/global.css): a computer keeps its
// sizes, a phone gets 15px for anything a client reads. The shared tokens use the scale's names, so helper and error
// text, labels and pills follow it everywhere they are spread into a style.
import { describe, expect, it } from "vitest";
import { tokens } from "../tokens";
import { components } from "../components";

describe("readable type scale", () => {
  it("helper, error and label text use the scale (15px on a phone), not fixed 12-14px sizes", () => {
    expect(tokens.typography.helper.fontSize).toBe("var(--bf-text-help)");
    expect(tokens.typography.error.fontSize).toBe("var(--bf-text-help)");
    expect(tokens.typography.label.fontSize).toBe("var(--bf-text-body-sm)");
  });

  it("no shared component style is fixed below 15px", () => {
    const small: string[] = [];
    const walk = (o: unknown, path: string) => {
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (k === "fontSize" && (typeof v === "number" ? v < 15 : /^(\d+(\.\d+)?)px$/.test(String(v)) && parseFloat(String(v)) < 15)) small.push(`${path}.${k}=${String(v)}`);
        else walk(v, `${path}.${k}`);
      }
    };
    walk(components, "components");
    walk(tokens.typography, "tokens.typography");
    expect(small).toEqual([]);
  });
});
