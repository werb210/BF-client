// BF_CLIENT_FLINKS_EMBED_DEMO_v1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import FlinksDemoPage from "../FlinksDemoPage";
describe("Flinks embed demo", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => { vi.useRealTimers(); cleanup(); });
  it("makes no network calls and is noindex", () => { const spy=vi.spyOn(globalThis,"fetch" as never); render(<FlinksDemoPage/>); expect(spy).not.toHaveBeenCalled(); expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow"); spy.mockRestore(); });
  it("hides notes until asked", () => { render(<FlinksDemoPage/>); expect(screen.queryByText(/opens a new tab/i)).toBeNull(); fireEvent.click(screen.getByRole("button",{name:/show technical notes/i})); expect(screen.getByText(/opens a new tab/i)).toBeTruthy(); });
  it("walks the full round trip", async () => { render(<FlinksDemoPage/>); fireEvent.click(screen.getByRole("button",{name:/connect bank account/i})); expect(screen.getByText(/accordfinancial\.flinksapp\.io/)).toBeTruthy(); fireEvent.click(screen.getByRole("button",{name:/get started/i})); fireEvent.click(screen.getByRole("button",{name:/link bank account/i})); fireEvent.click(screen.getByRole("button",{name:"RBC"})); await waitFor(()=>screen.getByText(/accounts connected/i),{timeout:4000}); fireEvent.click(screen.getByRole("button",{name:/continue/i})); await waitFor(()=>screen.getByText(/what boreal received/i),{timeout:4000}); expect(screen.getAllByText(/not received/i)).toHaveLength(3); expect(screen.getAllByText(/bank connected/i)).toHaveLength(2); });
  it("keeps the explanation on the page", () => { render(<FlinksDemoPage/>); expect(screen.getByText(/Boreal absorbs no Flinks cost/i)).toBeTruthy(); expect(screen.getByText(/never receives the banking data/i)).toBeTruthy(); expect(screen.getByText(/client\.boreal\.financial/)).toBeTruthy(); expect(screen.getByText(/will not permit third-party framing/i)).toBeTruthy(); });
});
