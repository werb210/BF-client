import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import App from "./App";
import { validateEnv } from "./env";
import { registerClientSW } from "./pwa/registerSW";
import { startPendingSubmitWatcher } from "./state/pendingSubmit";
// BF_UPLOAD_QUEUE_v51 — V1 upload-later retry queue
import { startUploadQueueWatcher } from "./state/uploadQueueWatcher";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

registerClientSW();
