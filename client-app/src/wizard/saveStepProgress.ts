import { saveApplicationStep } from "../api/applicationProgress";
import { ApplicationData } from "../types/application";

export async function persistApplicationStep(
  app: ApplicationData,
  step: number,
  data: Record<string, any>
) {
  const applicationId = app.applicationId || app.applicationToken;

  if (!applicationId) {
    // Steps 1-3 run before the application exists on the server.
    // Local draft is already saved via saveStepData. Skip server save silently.
    return;
  }

  try {
    await saveApplicationStep({
      applicationId,
      step,
      data,
    });
  } catch (err) {
    // Autosave is best-effort. Never block the user from advancing.
    console.debug(`[autosave] step ${step} save failed (non-blocking):`, err);
  }
}
