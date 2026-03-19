import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import ErrorBoundary from "./components/ErrorBoundary";
import "@/api/init";
import { bootstrapSession } from "./app/bootstrap";
import "./index.css";

async function start() {
  const session = await bootstrapSession();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <App initialSession={session} />
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  );
}

void start();
