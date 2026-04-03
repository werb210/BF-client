import "@/lib/fetchGuard";
import "@/lib/networkGuard";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { bootstrapSession } from "./app/bootstrap";
import { initAuth } from "@/api/auth";
import "./index.css";
import { waitForReady } from "@/lib/ready";

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UNHANDLED PROMISE]", e.reason);
});

window.addEventListener("error", (e) => {
  console.error("[RUNTIME ERROR]", e.error);
});

async function bootstrap() {
  await waitForReady();
  await initAuth();
  const session = await bootstrapSession();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App initialSession={session} />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
