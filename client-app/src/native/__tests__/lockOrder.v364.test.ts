// BF_CLIENT_LOCK_ORDER_v364
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");
const hook = read("useBiometricLock.ts");
const gate = read("BiometricGate.tsx");
const leave = read("useLeaveIfSignedIn.ts");
const landing = read("..", "pages", "LandingPage.tsx");
const otp = read("..", "pages", "OtpPage.tsx");

describe("Face ID signs the client in", () => {
  it("the lock decides before the app renders", () => {
    expect(hook).toContain("const [ready, setReady] = useState(!Capacitor.isNativePlatform());");
    expect(hook).toContain("} finally { setReady(true); } }, []);");
    expect(hook).toContain("if (!enrolled) return; // v323");
    const hold = gate.indexOf("if (!ready) return");
    expect(hold).toBeGreaterThan(-1);
    expect(hold).toBeLessThan(gate.indexOf("if (!locked) return <>{children}</>;"));
  });
  it("a renewed session is announced", () => {
    expect(hook).toContain('if (renewed) window.dispatchEvent(new Event("boreal:session-renewed"));');
  });
  it("the landing and text-code pages move a signed-in client on, in the app only", () => {
    expect(landing).toContain("useLeaveIfSignedIn();");
    expect(otp).toContain("useLeaveIfSignedIn();");
    expect(leave).toContain("if (!Capacitor.isNativePlatform()) return;");
    expect(leave).toContain('return next.action === "portal" ? "/portal" : "/apply/step-1";');
    expect(leave).toContain('window.addEventListener("boreal:session-renewed", leave);');
  });
});
