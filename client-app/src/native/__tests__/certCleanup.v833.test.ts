// BF_CLIENT_v833_CERT_CLEANUP - the certificate cleanup run before each cloud archive deletes only leftover "Created via API"
// development certificates: never the Distribution Managed certificate, Andrew Polturak's, the VoIP certificates, or
// one made in the last 75 minutes (another app's upload may be using it).
import { describe, expect, it } from "vitest";

const modulePath = "../../../../scripts/asc-cleanup-dev-certs.mjs";

describe("cloud certificate cleanup", () => {
  it("deletes only leftover API development certificates", async () => {
    const { isLeftoverApiDevCert }: any = await import(/* @vite-ignore */ new URL(modulePath, import.meta.url).href);
    const now = Date.parse("2026-10-20T18:00:00Z");
    const cert = (certificateType: string, displayName: string, expirationDate = "2027-06-01T00:00:00Z") =>
      ({ attributes: { certificateType, name: displayName, displayName, expirationDate } });
    expect(isLeftoverApiDevCert(cert("DEVELOPMENT", "Created via API"), now)).toBe(true);
    expect(isLeftoverApiDevCert(cert("IOS_DEVELOPMENT", "Created via API"), now)).toBe(true);
    expect(isLeftoverApiDevCert(cert("DISTRIBUTION", "Distribution Managed"), now)).toBe(false);
    expect(isLeftoverApiDevCert(cert("DEVELOPMENT", "Andrew Polturak"), now)).toBe(false);
    expect(isLeftoverApiDevCert(cert("IOS_DEVELOPMENT", "VoIP Services: Created via API"), now)).toBe(false);
    expect(isLeftoverApiDevCert(cert("DEVELOPMENT", "Created via API", "2027-10-20T17:30:00Z"), now)).toBe(false);
  });
});
