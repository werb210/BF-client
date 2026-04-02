import { createApplication, submitApplication, uploadDocuments } from "../api/applications";

export async function runSubmissionFlow() {
  const app = (await createApplication()) as { applicationId?: string; id?: string };
  const id = app.applicationId || app.id;

  id || (() => {
    throw new Error("Missing applicationId");
  })();

  await uploadDocuments(id, []);
  await submitApplication(id);

  return id;
}
