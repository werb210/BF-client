import "./bootStorageSafe"; // BF_CLIENT_BLOCK_v867_STORAGE_SHIM — must be first
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// BF_CLIENT_BLOCK_v103_TAILWIND_PIPELINE_FIX_v1
// theme/global.css carries @tailwind base/components/utilities and the
// Boreal CSS variables. styles/global.css is the legacy reset-only file
// kept for the 13 lines of body/box-sizing rules. Both are imported.
import "./theme/global.css";
import "./styles/global.css";
import App from "./App";
import { validateEnv } from "./env";
import { registerClientSW } from "./pwa/registerSW";
import { startPendingSubmitWatcher } from "./state/pendingSubmit";
// BF_UPLOAD_QUEUE_v51 — V1 upload-later retry queue
import { startUploadQueueWatcher } from "./state/uploadQueueWatcher";
// BF_CLIENT_BLOCK_v76_FORM_RESPONSE_QUEUE_AND_LP_CACHE_v1
import { startFormResponseQueueWatcher } from "./state/formResponseQueueWatcher";
import { validateBootToken } from "./state/validateBootToken";

try {
  validateEnv();
} catch (err) {
  console.error("ENV ERROR IGNORED:", err);
}

console.log("NEW BUILD LIVE:", new Date().toISOString());

// BF_LOCAL_FIRST_v35 — auto-retry pending submits on online/interval/boot.
startPendingSubmitWatcher();
// BF_UPLOAD_QUEUE_v51
startUploadQueueWatcher();
// BF_CLIENT_BLOCK_v76_FORM_RESPONSE_QUEUE_AND_LP_CACHE_v1
startFormResponseQueueWatcher();

void validateBootToken();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

registerClientSW();
