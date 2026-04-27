import { ApplicationData } from "../types/application";

// BF_LOCAL_FIRST_v35 — Block 35: per-step server save disabled. The wizard
// is local-first; the server only sees the application at Step 6 submit.
// The function signature is preserved so all existing `await
// persistApplicationStep(app, N, data)` call sites remain valid no-ops.
// To re-enable later (e.g. an explicit "Save & Continue Later" button),
// route the call through ClientAppAPI.update() with a new schema-flag.
export async function persistApplicationStep(
  _app: ApplicationData,
  _step: number,
  _data: Record<string, any>
) {
  return;
}
