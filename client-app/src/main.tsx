import React from "react";
import ReactDOM from "react-dom/client";
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
    <App />
  </React.StrictMode>
);
