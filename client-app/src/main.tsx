import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import "@/api/init";
import { bootstrapSession, enforceAuthStartup } from "./app/bootstrap";
import { enforceLeadHandoff } from "./app/init";
import { initAuth } from "@/lib/auth";
import "./index.css";

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function start() {
  enforceLeadHandoff();
  enforceAuthStartup();
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
