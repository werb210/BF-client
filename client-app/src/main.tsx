import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import App from "./App";
import { validateEnv } from "./env";

try {
  validateEnv();
} catch (err) {
  console.error("ENV ERROR IGNORED:", err);
}

console.log("NEW BUILD LIVE:", new Date().toISOString());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Temporarily disabled while SWA deployment is stabilized.
// if (import.meta.env.PROD) {
//   registerServiceWorker();
// }
