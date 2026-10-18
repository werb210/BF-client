// BF_CLIENT_v824_CHAT_MEDIA - chat attachments are drawn by what actually arrived.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/auth/token", () => ({ getToken: () => "tok-1" }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.example.test" } }));

import AuthorizedAttachment, { attachmentKind } from "../AuthorizedAttachment";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  (URL as any).createObjectURL = vi.fn(() => "blob:v824");
  (URL as any).revokeObjectURL = vi.fn();
});
afterEach(() => { vi.unstubAllGlobals(); });

const PATH = "/api/client/messages/m1/media?applicationId=a1";

describe("chat media v824", () => {
  it("sorts content types", () => {
    expect(attachmentKind("image/jpeg")).toBe("image");
    expect(attachmentKind("audio/x-wav; charset=binary")).toBe("audio");
    expect(attachmentKind("application/pdf")).toBe("file");
    expect(attachmentKind(null)).toBe("file");
  });

  it("plays a voicemail the server guessed was a picture", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "audio/x-wav" }),
      blob: async () => new Blob(["RIFF"], { type: "audio/x-wav" }) });
    render(<AuthorizedAttachment attachment={{ name: "Picture", contentType: "image/jpeg", url: PATH }} />);
    const audio = await screen.findByTestId("attachment-audio");
    expect(audio.getAttribute("src")).toBe("blob:v824");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("offers a link when a picture can't be drawn", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"], { type: "image/heic" }) });
    render(<AuthorizedAttachment attachment={{ name: "Picture", contentType: "image/jpeg", url: PATH }} />);
    const img = await screen.findByRole("img");
    fireEvent.error(img);
    const link = await screen.findByRole("link");
    expect(link.textContent).toBe("Open picture");
    expect(link.getAttribute("href")).toBe("blob:v824");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("falls back to a link for an app-added picture that can't be drawn", () => {
    const dataUrl = "data:image/heic;base64,AAAA";
    render(<AuthorizedAttachment attachment={{ name: "IMG_1.heic", contentType: "image/heic", dataUrl }} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("link").textContent).toBe("📎 IMG_1.heic");
  });
});
