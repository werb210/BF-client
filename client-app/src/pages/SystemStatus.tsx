import { getMode } from "@/config/env";

export default function SystemStatus() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Client System Status</h1>
      <p>Environment: {getMode()}</p>
      <p>Build Time: {new Date().toISOString()}</p>
    </div>
  );
}
