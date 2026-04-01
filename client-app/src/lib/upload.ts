import { apiUpload } from "@/lib/api";

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiUpload("/api/upload", form);
}
