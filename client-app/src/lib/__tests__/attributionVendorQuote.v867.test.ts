// BF_CLIENT_v867_BROKER_TOOLS_VENDORS - a vendor's apply link (?ref=<vendor code>&vq=<quote id>) rides to the application.
import { beforeEach, describe, expect, it } from "vitest";
import { captureAttribution, getAttribution } from "../attribution";

const setUrl = (search: string) => window.history.replaceState({}, "", `/${search}`);

beforeEach(() => sessionStorage.clear());

describe("vendor apply link", () => {
  it("keeps the vendor's code and quote", () => {
    setUrl("?ref=PRAIRI-ABC123&vq=0b6f3e2a-1c4d-4e8f-9a7b-2d5c6e7f8a9b&utm_source=vendor");
    captureAttribution();
    expect(getAttribution()).toMatchObject({ ref: "PRAIRI-ABC123", vq: "0b6f3e2a-1c4d-4e8f-9a7b-2d5c6e7f8a9b", utm_source: "vendor" });
  });

  it("ignores a quote id that is not one", () => {
    setUrl("?ref=PRAIRI-ABC123&vq=<script>");
    captureAttribution();
    expect(getAttribution().vq).toBeUndefined();
  });
});
