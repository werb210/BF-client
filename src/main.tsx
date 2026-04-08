import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { checkReadiness } from "./lib/startup";

async function bootstrap() {
  const ready = await checkReadiness();

  if (!ready) {
    console.warn("API not ready");
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
