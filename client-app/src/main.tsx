import "@/lib/fetchGuard";
import "@/lib/networkGuard";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { bootstrapSession } from "./app/bootstrap";
import { initAuth } from "@/api/auth";
import "./index.css";
import { apiRequest } from "@/lib/api";
import { getEnv, getMode } from "@/config/env";

getEnv();

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function assertBackend() {
  const mode = getMode();
  if (mode === "test") return;
  if (mode === "production") return;
  if (mode !== "development") return;

  await apiRequest<{ status?: string }>("/health");
}

async function start() {
  await assertBackend();
  await initAuth();
  const session = await bootstrapSession();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App initialSession={session} />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

void start();
