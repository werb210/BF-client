import { useState } from "react";

type FileItem = {
  file: File;
  category: string;
};

const allowedTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export default function Step5Documents({ onNext }: { onNext: () => void }) {
  const [files, setFiles] = useState<FileItem[]>([]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const fileList = e.target.files;
    if (!fileList) return;

    const validFiles: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (!allowedTypes.includes(file.type)) {
        continue;
      }

      validFiles.push({ file, category });
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }

  return (
    <div>
      <h2>Upload Documents</h2>

      <input type="file" multiple onChange={(e) => handleUpload(e, "general")} />

      <ul>
        {files.map((f, i) => (
          <li key={i}>{f.file.name} ({f.category})</li>
        ))}
      </ul>

      <button onClick={onNext}>Continue</button>
    </div>
  );
}
