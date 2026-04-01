import "@/lib/networkGuard";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { bootstrapSession } from "./app/bootstrap";
import { initAuth } from "@/api/auth";
import "./index.css";

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function assertBackend() {
  const base = import.meta.env.VITE_API_URL;
  const res = await fetch(`${base}/health`);
  if (!res.ok) {
    throw new Error("Backend not reachable");
  }
}

async function start() {
  await assertBackend();
  await initAuth();
  const session = await bootstrapSession();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App initialSession={session} />
      </BrowserRouter>
    </React.StrictMode>
  );
}

void start();
