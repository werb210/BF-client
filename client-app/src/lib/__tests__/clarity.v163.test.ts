// BF_CLIENT_CLARITY_LOADER_v163
import { describe, it, expect, afterEach, vi } from "vitest";
import { initClarity } from "../clarity";

afterEach(() => {
  delete (window as any).clarity;
  document.querySelectorAll('script[src*="clarity.ms/tag"]').forEach((n) => n.remove());
  vi.restoreAllMocks();
});

describe("initClarity", () => {
  it("injects the Clarity tag for the client project and defines window.clarity", () => {
    initClarity();
    const tag = document.querySelector('script[src*="clarity.ms/tag/"]') as HTMLScriptElement | null;
    expect(tag).not.toBeNull();
    expect(tag!.src).toContain("clarity.ms/tag/x8jrwbuviw");
    expect(typeof (window as any).clarity).toBe("function");
  });

  it("does not double-load when window.clarity already exists (e.g. GTM injected it)", () => {
    (window as any).clarity = () => {};
    initClarity();
    expect(document.querySelectorAll('script[src*="clarity.ms/tag"]').length).toBe(0);
  });

  it("does not double-load when a Clarity tag is already in the DOM", () => {
    const s = document.createElement("script");
    s.src = "https://www.clarity.ms/tag/x8jrwbuviw";
    document.head.appendChild(s);
    initClarity();
    expect(document.querySelectorAll('script[src*="clarity.ms/tag"]').length).toBe(1);
  });

  it("never throws", () => {
    expect(() => initClarity()).not.toThrow();
  });
});
