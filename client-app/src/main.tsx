import "@/lib/networkGuard";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { ENV } from "./env";
import { waitForServer } from "./init";
import { ErrorBoundary } from "./components/ErrorBoundary";

async function start() {
  if (import.meta.env.DEV) {
    console.log("ENV:", ENV);
  }

  await waitForServer();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

void start();
