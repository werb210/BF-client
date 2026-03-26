# Client App Test Target Report (March 19, 2026)

## Scope requested
Validated these targets without applying fixes:
1. Auth (phone-only send, no email send, OTP end-to-end)
2. Application submission (`POST /applications` auth vs unauth and payload shape)
3. Step form logic (7-step render, state persistence, per-step validation)
4. Document upload (high risk)
5. Retry / API handling
6. Known likely-break areas (localStorage mocks, auth mocks using email, outdated test data shape)

## What was executed
- `npm test` from `client-app` (`vitest run`)
- Result: **51 test files passed, 151 tests passed, 0 failed**.

## Detailed findings by target

### 1) Auth
**Result: PARTIAL PASS (core OTP flow covered and passing).**

- **Sends phone:** Covered. OTP service tests assert `/auth/otp/start` payload contains normalized `phone` (E.164), and OTP verify posts phone+code to `/auth/otp/verify`.
- **NOT sending email:** No explicit negative assertion found that email is excluded in OTP requests.
- **OTP flow works end-to-end:** Covered at runtime-component level. Portal entry tests cover send failure behavior, single auto-submit verify behavior, success redirect to `/portal`, and failure inline errors.

**Interpretation:** Auth phone-based OTP path is tested and currently green. However, the strict “email must not be sent” requirement is only indirectly implied, not explicitly asserted as a hard negative test.

### 2) Application submission
**Result: PARTIAL PASS with endpoint mismatch risk.**

- Existing tests cover application submit payload behavior and expected enrichment (attribution fields, continuation token, persisted credit session token).
- Submission test target in code is `"/client/applications"`, not `"/applications"`.
- No direct automated assertion found for:
  - `POST /applications with auth -> 200`
  - `POST /applications without auth -> 401`

**Interpretation:** Payload structure assertions are present and passing for current client submission path, but requested auth/unauth status checks for `/applications` are not directly covered by current tests.

### 3) Step form logic
**Result: PARTIAL PASS with requirement mismatch.**

- **All 7 steps render:** Not validated. Router currently defines `/apply/step-1` through `/apply/step-6` (6 steps).
- **State persists between steps:** Partial coverage via autosave draft tests (save/load/merge/clear behavior in storage).
- **Validation works per step:** Partial coverage via schema lock tests for Step1/3/4 and field set enforcement.

**Interpretation:** Current test suite supports persistence and schema validation, but does not verify “7 steps render”; current implementation appears to be a 6-step flow.

### 4) Document upload (HIGH RISK)
**Result: PARTIAL PASS with one uncovered backend-observability concern.**

- **Upload succeeds:** Logic path exists and is exercised indirectly through passing suite; upload call path is implemented.
- **File types accepted correctly:** Enforced by `validateFile` allow-list (`pdf/docx/xlsx/png/jpeg`) and max 25 MB.
- **Backend receives file:** Upload API builds `FormData` and posts to `/documents/upload`, including token/document metadata and file.
- **No silent failures:** Mixed.
  - Upload loop retries up to 3 attempts, then surfaces explicit UI error (`Document upload failed. Please retry.`).
  - But one status refresh catch block is empty (`catch(() => {})`), which can suppress status-refresh errors.

**Interpretation:** Main upload path has type guards, retries, and user-facing errors; there remains a silent-failure risk in refresh-status error handling.

### 5) Retry / API handling
**Result: PASS (for covered APIs), with scope caveat.**

- Website API tests explicitly assert one retry on 503 during readiness submission.
- In-flight dedupe tests ensure duplicate submissions reuse same promise resolution path.
- Upload path retries 3 attempts and surfaces terminal errors.

**Interpretation:** Retry and anti-hang behavior are present in tested areas; not every endpoint has equivalent explicit retry tests.

### 6) Expected failures from user note
**Result: NOT REPRODUCED in this run.**

- **localStorage mocks:** Existing test setup and per-test stubs are working in this environment; no failing localStorage mock tests observed.
- **auth mocks still using email:** Current OTP tests are phone-oriented and passed.
- **outdated test data shape:** No shape-related failures observed; schema tests passed.

## High-signal gap list (not fixed)
1. No direct test proving OTP requests never include email as a field.
2. Requested `/applications` auth-vs-unauth 200/401 checks are not directly present (tests currently target `/client/applications`).
3. Requested “all 7 steps render” does not align with current 6-step route and inventory tests.
4. Silent-failure risk remains in document status refresh catch block.

## Final status summary
- **Overall suite health:** Green in this environment (151/151 passing).
- **Target confidence:** Mixed; several requested targets are partially covered or currently misaligned with app implementation/contracts.
- **No code fixes applied to production logic in this run.**
