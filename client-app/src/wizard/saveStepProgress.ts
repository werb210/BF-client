import { saveApplicationStep } from "../api/applicationProgress";
import { ApplicationData } from "../types/application";

export async function persistApplicationStep(
  app: ApplicationData,
  step: number,
  data: Record<string, any>
) {
  const applicationId = app.applicationId || app.applicationToken;

  if (!applicationId) {
    // Steps 1–3 run before the application is created on the server.
    // Local draft is already saved. Silently skip the server call.
    console.debug(`[autosave] step ${step}: no applicationId yet — skipping server save`);
    return;
  }

  await saveApplicationStep({
    applicationId,
    step,
    data,
  });
}
