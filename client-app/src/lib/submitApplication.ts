import { apiSubmit } from "./api";

export async function submitApplication(payload: any) {
  return apiSubmit("/api/applications", payload);
}
