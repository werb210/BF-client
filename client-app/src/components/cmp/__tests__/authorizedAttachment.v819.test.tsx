// BF_CLIENT_v819_CLIENT_MMS - a picture the client texted in shows as a picture, fetched with the client's token.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ token: "tok-123" as string | null }));
vi.mock("@/auth/token", () => ({ getToken: () => h.token }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.example.test" } }));

import AuthorizedAttachment from "../AuthorizedAttachment";

const fetchMock = vi.fn();
const createObjectURL = vi.fn(() => "blob:mock-1");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  h.token = "tok-123";
  fetchMock.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  (URL as any).createObjectURL = createObjectURL;
  (URL as any).revokeObjectURL = revokeObjectURL;
});
afterEach(() => { vi.unstubAllGlobals(); });

const URL_PATH = "/api/client/messages/m1/media?applicationId=a1";

describe("AuthorizedAttachment", () => {
  it("fetches a url attachment with the client's token and shows it as a picture", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"], { type: "image/jpeg" }) });
    const { unmount } = render(<AuthorizedAttachment attachment={{ name: "Picture", contentType: "image/jpeg", url: URL_PATH }} />);
    expect(screen.getByTestId("attachment-loading").textContent).toBe("Picture");
    const img = await screen.findByRole("img");
    expect(img.getAttribute("src")).toBe("blob:mock-1");
    expect(img.closest("a")?.getAttribute("href")).toBe("blob:mock-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe("https://api.example.test" + URL_PATH);
    expect(init.headers).toEqual({ Authorization: "Bearer tok-123" });
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
  });

  it("says the picture couldn't load when the fetch fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, blob: async () => new Blob() });
    render(<AuthorizedAttachment attachment={{ name: "Picture", contentType: "image/jpeg", url: URL_PATH }} />);
    await waitFor(() => expect(screen.getByTestId("attachment-error").textContent).toBe("Picture couldn't load"));
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows a non-image url attachment as a file link", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["%PDF"], { type: "application/pdf" }) });
    render(<AuthorizedAttachment attachment={{ name: "File", contentType: "application/pdf", url: URL_PATH }} />);
    const link = await screen.findByRole("link");
    expect(link.textContent).toBe("📎 File");
    expect(link.getAttribute("href")).toBe("blob:mock-1");
  });

  it("renders a dataUrl image exactly as before, with no fetch", () => {
    const dataUrl = "data:image/png;base64,AAAA";
    render(<AuthorizedAttachment attachment={{ name: "me.png", contentType: "image/png", dataUrl }} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe(dataUrl);
    expect(img.getAttribute("alt")).toBe("me.png");
    expect(img.closest("a")?.getAttribute("href")).toBe(dataUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders a dataUrl file as a download link, with no fetch", () => {
    const dataUrl = "data:application/pdf;base64,AAAA";
    render(<AuthorizedAttachment attachment={{ name: "doc.pdf", contentType: "application/pdf", dataUrl }} />);
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("📎 doc.pdf");
    expect(link.getAttribute("download")).toBe("doc.pdf");
    expect(link.getAttribute("href")).toBe(dataUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
