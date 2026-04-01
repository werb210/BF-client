import { apiRequest } from "@/lib/api";

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiRequest("/api/upload", {
    method: "POST",
    body: form,
  });
}
