import ReactDOM from "react-dom/client";
import App from "./app/App";
import { waitForServer } from "./init";
import { ErrorBoundary } from "./components/ErrorBoundary";

async function start() {
  await waitForServer();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

void start();
