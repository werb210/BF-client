import { beforeEach, describe, expect, it } from "vitest";
import { credentialStore } from "../credentialStore";

describe("browser credential store", () => {
  beforeEach(() => localStorage.clear());
  it("saves and retrieves a token", async () => {
    await credentialStore.set("token");
    expect(await credentialStore.get()).toBe("token");
  });
  it("clears a token", async () => {
    await credentialStore.set("token"); await credentialStore.clear();
    expect(await credentialStore.get()).toBeNull();
  });
});
