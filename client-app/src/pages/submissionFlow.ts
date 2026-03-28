import { createApplication, submitApplication, uploadDocuments } from "../api/applications";

export async function runSubmissionFlow() {
  const app = await createApplication();
  const id = (app as { applicationId?: string }).applicationId;

  id || (() => { throw new Error("Missing applicationId"); })();

  await uploadDocuments(id, []);
  await submitApplication(id);

  return id;
}
