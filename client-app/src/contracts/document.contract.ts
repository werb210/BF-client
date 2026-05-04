export const DOCUMENT_CONTRACT = {
  // BF_CLIENT_BLOCK_v108_DOC_UPLOAD_PUBLIC_PATH_v1 — wizard is unauthenticated,
  // server /api/documents/upload requires JWT. Use /public-upload instead
  // (documents.ts:122 — same body shape, no auth).
  UPLOAD: "/api/documents/public-upload",
  FIELDS: {
    FILE: "file",
    APPLICATION_ID: "applicationId",
    CATEGORY: "category"
  }
} as const;
