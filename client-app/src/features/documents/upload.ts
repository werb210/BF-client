export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/documents/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error("UPLOAD_FAILED");
  }

  return res.json();
}
