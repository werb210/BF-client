# BF-Client → BF-Server Connectivity Verification

This verification confirms BF-Client uses the unified API client and triggers OTP authentication endpoints against BF-Server.

## Step 1 — API Base Config
- File checked: `src/config/runtimeConfig.ts`
- `runtimeConfig.API_BASE` resolves in this order:
  1. `import.meta.env.VITE_API_URL`
  2. `window.RUNTIME_CONFIG?.API_BASE_URL`
  3. `"/api"`

Result: ✅ Matches requirement (`VITE_API_URL` or `/api`).

## Step 2 — API Client
- File checked: `src/api/apiClient.ts`
- `apiClient` is created using `axios.create({...})` with:
  - `baseURL: runtimeConfig.API_BASE`
  - `withCredentials: true`

Result: ✅ Unified axios client exists and is configured from runtime API base.

## Step 3 — No Direct axios.get/post/patch Calls in src
Command run:

```bash
rg "axios\.(get|post|patch)" client-app/src
```

Result: ✅ 0 matches.

## Step 4 — Build and Preview
Commands run:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Result: ✅ Build succeeded and preview served at `http://localhost:4173`.

## Step 5 — Login Flow Network Verification
- Opened: `http://localhost:4173/otp`
- Triggered OTP send + verify flow in browser automation.
- Captured network requests:
  - `POST https://server.boreal.financial/auth/otp/start`
  - `POST https://server.boreal.financial/auth/otp/verify`

Result: ✅ OTP auth flow routes to BF-Server endpoints.

![Login flow screenshot](browser:/tmp/codex_browser_invocations/2eb38e96123636c6/artifacts/artifacts/login-flow.png)
