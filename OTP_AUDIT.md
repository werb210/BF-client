# OTP Audit (Client) — 2026-05-19

## STEP 1 — OTP entry points
Command run:

```bash
git ls-files | xargs grep -nE 'otp|/auth/otp|phone|mobile|verify' --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' 2>/dev/null
```

Key OTP flow files identified:
- `client-app/src/components/PhoneOTPInline.tsx` (landing page inline OTP path, direct fetches).
- `client-app/src/pages/OtpPage.tsx` (dedicated `/otp` route flow).
- `client-app/src/api/auth.ts` and `client-app/src/api/client.ts` (OTP API wrappers).
- `client-app/src/wizard/Step1_KYC.tsx` (wizard-side `/api/public/application/start` with `readiness_phone` claim behavior).
- `client-app/src/env.ts`, `.env*`, and `client-app/src/config/env.ts` (API base env selection).

---

## STEP 2 — Components capturing phone and submitting it

### A) Landing page OTP entry (`PhoneOTPInline`)
- Captures user phone in `phoneDisplay` state.
- Normalizes via `tenDigits(...)` and `toE164(...)`.
- Sends OTP start request to `POST /api/auth/otp/start` with `{ phone: e164, channel: 'sms' }`.
- Then verifies with `POST /api/auth/otp/verify`.

### B) Dedicated OTP page (`OtpPage`)
- Captures user phone in `phone` state.
- Normalizes via page-local `toE164(...)`.
- Sends OTP start via `startOtp(formatted)` (API wrapper -> `/api/auth/otp/start`).
- Verifies OTP via `verifyOtp(formatted, otpCode)`.

### C) Wizard step relationship (`Step1_KYC`)
- Does **not** appear to be OTP start/verify itself.
- It consumes `sessionStorage.verified_phone` (set after OTP verify) and sends `readiness_phone` in `/api/public/application/start` to claim an existing readiness draft.

---

## STEP 3 — Required full dumps and behavior findings

### 3.1 Function that POSTs to `/api/auth/otp/start`

#### `PhoneOTPInline.sendCode()` (direct fetch)
```ts
async function sendCode(): Promise<void> {
  setError(null);
  const e164 = toE164(phoneDisplay);
  if (!e164) {
    setError('Please enter a valid 10-digit phone number.');
    return;
  }
  setPhoneE164(e164);
  setBusy(true);
  try {
    const res = await fetchWithTimeout(
      API_BASE + '/api/auth/otp/start',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: e164, channel: 'sms' }),
      },
      15000,
      'start',
    );
    if (!res.ok) {
      const body = await res.text().catch(() => String(res.status));
      console.warn('[otp] start.fail', { status: res.status, body });
      throw new Error('Could not send code. Please double-check your number and try again.');
    }
    autoSubmittedCodeRef.current = null;
    setPhase('code');
  } catch (err: any) {
    setError(err?.message || 'Failed to send code');
  } finally {
    setBusy(false);
  }
}
```

#### `api/auth.ts -> sendOtp(phone)` used by `OtpPage.handleSendCode()`
```ts
export function sendOtp(phone: string) {
  return apiRequest(endpoints.otpStart, {
    method: "POST",
    body: { phone },
  });
}
```

`endpoints.otpStart` resolves to `/api/auth/otp/start`.

### 3.2 Phone normalization / input-mask logic

#### In `PhoneOTPInline.tsx`
- `tenDigits(raw)` strips non-digits, converts 11-digit leading `1` to 10 digits, and if longer than 10 takes **last 10 digits**.
- `toE164(raw)` only accepts exact 10 digits post-normalization and returns `+1XXXXXXXXXX`; anything else => `null`.
- `formatDisplay(raw)` applies `(XXX) XXX-XXXX` display formatting.

#### In `OtpPage.tsx`
- `toE164(raw)` strips non-digits.
- If 11 digits starting with `1`, returns `+` + full 11 digits.
- If 10 digits, returns `+1` + digits.
- Otherwise returns **raw** input (partial/non-US values pass through to API call if non-empty).

### 3.3 Client-side validation rejecting certain phones

#### Hard rejection (landing `PhoneOTPInline`)
- Rejects anything not interpretable as US/Canada 10-digit local number.
- Error: `Please enter a valid 10-digit phone number.`
- Implies strong NA-only gating and potential rejection of valid non-NA E.164 numbers.

#### Soft/no strict rejection (`OtpPage`)
- Minimal gate: non-empty `formatted` value.
- Non-10/11-digit inputs are not locally rejected in `handleSendCode`; they can still be submitted to backend (unless input empty).
- UI label says `Mobile Phone Number (E.164)` and blur attempts formatting.

### 3.4 Error handling for `/api/auth/otp/start`

#### `PhoneOTPInline`
- For non-2xx from start endpoint:
  - logs body/status to console
  - surfaces generic message: `Could not send code. Please double-check your number and try again.`
- If network timeout: shows `Network is taking too long. Please try again.`
- It **does not** surface backend-provided error message body to user.

#### `OtpPage`
- `handleSendCode` catches all errors and shows generic:
  - `Failed to send code. Please check your number and try again.`
- It does **not** inspect backend response message.

Conclusion: both paths mainly show generic errors to end users; backend specifics are logged/ignored.

---

## STEP 4 — OTP-flow env vars (`VITE_*` / `REACT_APP_*`) and API base confirmation

### Env vars detected in repo for client
- `VITE_API_BASE_URL`
- `VITE_API_URL`
- `VITE_API_BASE` (code fallback name; not present in `.env*` sample but supported)
- `VITE_API_VERSION`
- No `REACT_APP_*` usage found in OTP path.

### Resolution logic
`client-app/src/env.ts`:
1. `VITE_API_BASE`
2. `VITE_API_BASE_URL`
3. `VITE_API_URL`
4. fallback `https://server.boreal.financial`

`PhoneOTPInline.tsx` and `Step1_KYC.tsx` directly read `VITE_API_URL`, fallback to `https://server.boreal.financial`.

### .env values in repo
- `.env`, `.env.local`, `.env.production`, `.env.example` set `VITE_API_BASE_URL=https://server.boreal.financial` and (except `.env.example`) `VITE_API_URL=https://server.boreal.financial`.

**Confirmation:** current checked-in env defaults for OTP flow point to `https://server.boreal.financial`.

---

## STEP 5 — Client-side hypotheses for “only operator’s phone succeeds”

1. **Dual OTP implementations with inconsistent validation**
   - Landing `PhoneOTPInline` strictly forces US/CA 10-digit normalization and local rejection.
   - `/otp` page is looser and may send raw or differently normalized values.
   - Depending on which entry point operator uses, behavior may differ.

2. **Over-aggressive `tenDigits` truncation in landing flow**
   - For any input >10 digits, it keeps last 10 digits.
   - International inputs or pasted E.164 with extensions/country codes can become wrong numbers silently.

3. **Country restriction baked into `+1` assumption**
   - `PhoneOTPInline.toE164` always outputs `+1...` only.
   - If operator tests with US number and others try non-US/alternate formats, only operator appears to work.

4. **Generic error masking hides true server rejection reasons**
   - Start endpoint errors are not surfaced verbatim to user in either flow.
   - Different failure causes (rate limit, blocked carrier, malformed number) all look similar, creating perception that only one phone works.

5. **Potential environment mismatch risk is low in checked-in config**
   - Repo env points to `server.boreal.financial`; likely not the root cause unless deployment overrides are different at runtime.

---

## Appendix — Additional relevant snippets

### `OtpPage.handleSendCode()`
```ts
async function handleSendCode() {
  const formatted = toE164(phone.trim()) || phone.trim();
  if (!formatted) return;
  if (sendInFlightRef.current) return;
  const now = Date.now();
  if (now - lastSentAtRef.current < SEND_COOLDOWN_MS) {
    setPhone(formatted);
    setStep("code");
    return;
  }
  sendInFlightRef.current = true;
  setPhone(formatted);
  setLoading(true);
  setError(null);
  try {
    await startOtp(formatted);
    lastSentAtRef.current = Date.now();
    setStep("code");
  } catch {
    setError("Failed to send code. Please check your number and try again.");
  } finally {
    sendInFlightRef.current = false;
    setLoading(false);
  }
}
```
