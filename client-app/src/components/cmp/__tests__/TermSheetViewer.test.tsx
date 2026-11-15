// BF_CLIENT_v957_OFFER_IN_APP
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import TermSheetViewer, { frameFromResponse } from "../TermSheetViewer";

describe("the term sheet and its signing stay inside the portal", () => {
  it("shows signing in a frame with a Done button", () => {
    const onClose = vi.fn();
    render(<TermSheetViewer frame={{ kind: "sign", title: "Review and sign", url: "https://app.signnow.com/x" }} onClose={onClose} />);
    expect(screen.getByTestId("offer-sign-frame").getAttribute("src")).toBe("https://app.signnow.com/x");
    fireEvent.click(screen.getByTestId("offer-frame-close"));
    expect(onClose).toHaveBeenCalled();
  });
  it("shows a Word term sheet as a locked page", () => {
    render(<TermSheetViewer frame={{ kind: "page", title: "Your term sheet", html: "<p>Terms</p>" }} onClose={() => {}} />);
    const f = screen.getByTestId("term-sheet-page");
    expect(f.getAttribute("sandbox")).toBe("");
    expect(f.getAttribute("srcdoc")).toContain("Terms");
  });
  it("sorts what the server sends", async () => {
    const page = await frameFromResponse(new Response("<p>x</p>", { headers: { "content-type": "text/html; charset=utf-8" } }), "t");
    expect(page.kind).toBe("page");
    const pdf = await frameFromResponse(new Response(new TextEncoder().encode("%PDF-1.7 ..."), { headers: { "content-type": "application/octet-stream" } }), "t");
    expect(pdf.kind).toBe("pdf");
    const other = await frameFromResponse(new Response("PK..", { headers: { "content-type": "application/zip" } }), "t");
    expect(other.kind).toBe("error");
  });
  it("the offer card opens nothing in another window", () => {
    const src = readFileSync("src/pages/MiniPortalPage.tsx", "utf8");
    const card = src.slice(src.indexOf('data-testid="sign-offer-btn"') - 400, src.indexOf('data-testid="view-pdf-link"') + 300);
    expect(card).not.toContain("window.open");
    const opener = src.slice(src.indexOf("const openTermSheet"), src.indexOf("BF_CLIENT_BLOCK_v727_APP_SWITCHER_v1"));
    expect(opener).not.toContain("window.open");
  });
});
