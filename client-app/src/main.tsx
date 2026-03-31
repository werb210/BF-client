import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import "@/api/init";
import { bootstrapSession, enforceAuthBootstrap } from "./app/bootstrap";
import { initAuth } from "@/lib/auth";
import "./index.css";

async function start() {
  enforceAuthBootstrap();
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
