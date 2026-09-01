import { describe, expect, it } from "vitest";
import { parseNativeUrl } from "../deepLinks";

describe("parseNativeUrl", () => {
  it.each([
    ["borealclient://home", "/portal"],
    ["borealclient://application", "/apply"],
    ["borealclient://application/app-1", "/application/app-1"],
    ["borealclient://documents", "/portal?section=documents"],
    ["borealclient://offers", "/portal?section=offers"],
    ["borealclient://messages", "/portal?section=messages"],
  ])("maps %s", (url, route) => expect(parseNativeUrl(url)).toBe(route));

  it.each(["", "not a url", "https://evil.example/application/1", "borealclient://unknown"])(
    "safely falls back for %s", (url) => expect(parseNativeUrl(url)).toBe("/portal")
  );
});
