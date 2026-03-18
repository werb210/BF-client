# Quality Assurance Test Matrix

This matrix translates the required scenarios into executable test cases for API, UI, security, and platform reliability.

## 1) Verification Workflow

| ID | Scenario | Preconditions | Steps | Expected Result |
|---|---|---|---|---|
| VER-001 | `start` creates record | No existing active verification for actor | Call `start` endpoint with valid payload | `201 Created`, JSON response, `success: true`, verification record persisted |
| VER-002 | `verify` success case | Valid active code | Submit correct code | `200 OK`, JSON response, `success: true`, code marked used |
| VER-003 | `verify` invalid code | Active verification exists | Submit unknown/incorrect code | `400` or `401` (per contract), `{ error: "invalid_code" }` |
| VER-004 | `verify` expired code | Expired verification code exists | Submit expired code | `400` or `409` (per contract), `{ error: "expired_code" }` |
| VER-005 | `verify` already used | Used verification code exists | Re-submit same code | `409 Conflict`, `{ error: "already_used" }` |

## 2) Authentication

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| AUTH-001 | Login success | Submit valid credentials | `200 OK`, JSON `success: true`, token/session issued |
| AUTH-002 | Login failure | Submit invalid credentials | `401 Unauthorized`, `{ error: "invalid_credentials" }` |
| AUTH-003 | Missing user | Login with unknown user identifier | `404 Not Found` (or `401` by policy), `{ error: "user_not_found" }` |

## 3) Authorization & Role Validation

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| ACL-001 | Admin access allowed | Call admin route with admin credentials | `200 OK`, authorized response |
| ACL-002 | Non-admin blocked | Call admin route with non-admin credentials | `403 Forbidden`, `{ error: "forbidden" }` |
| ROLE-001 | Valid roles accepted | Submit known role set | `200/201`, role accepted |
| ROLE-002 | Invalid roles rejected | Submit unsupported role | `400 Validation`, `{ error: "invalid_role" }` |

## 4) Token / Session

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| TOK-001 | Token issued | Complete successful auth | Access/refresh token returned (or session cookie created) |
| TOK-002 | Invalid token rejected | Call protected route with malformed/expired token | `401 Unauthorized`, `{ error: "invalid_token" }` |

## 5) Response Contract

### Global Assertions (apply to **every** endpoint)

- Response body is never `undefined`.
- Content type is JSON (`application/json` or compatible).
- Success shape is exactly: `{ success: true, data: ... }`.
- Error shape includes an error code: `{ error: "code" }`.

### Status Code Contract

| Case | Required Status |
|---|---|
| Success | `200 OK` |
| Created resource | `201 Created` |
| Validation error | `400 Bad Request` |
| Auth failure | `401 Unauthorized` |
| Forbidden | `403 Forbidden` |
| Missing resource | `404 Not Found` |
| Conflict | `409 Conflict` |

## 6) Application Workflows

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| APP-001 | Create application | Submit valid application payload | `201 Created`, `owner_user_id` set correctly |
| APP-002 | Update status | Request status transition | Valid transitions succeed with `200` |
| APP-003 | Ownership enforcement | User accesses application not owned by them | `403` or filtered data; no cross-user leakage |

## 7) State Transitions

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| ST-001 | Valid transitions succeed | Transition through allowed states | `200`, new state persisted |
| ST-002 | Invalid transitions fail | Attempt illegal state change | `400/409`, `{ error: "invalid_transition" }` |

## 8) Edge Cases

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| EDGE-001 | Duplicate actions | Repeat same create/submit action | Idempotent handling or `409 Conflict` |
| EDGE-002 | Missing dependencies | Execute workflow without required dependency data | `400/404` with specific error code |
| EDGE-003 | Invalid inputs | Fuzz malformed fields | Validation failure, never server crash |

## 9) Admin Actions & Permissions

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| ADM-001 | Enable user | Admin enables disabled user | `200`, state updated, audit log entry created |
| ADM-002 | Disable user | Admin disables active user | `200`, state updated, audit log entry created |
| ADM-003 | Permission enforcement | Non-admin executes admin action | `403`, `{ error: "forbidden" }` |

## 10) Role-Based Behavior

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| RBAC-001 | Correct permissions by role | Run matrix of role × action | Allowed actions succeed, disallowed return `403` |

## 11) Error Handling Requirements

All error scenarios (validation, auth, authorization, missing data, conflicts, internal failures) must:

1. Return JSON.
2. Include stable `error` code string.
3. Never return `undefined` payloads.

## 12) Required Negative Test Cases

- Invalid input.
- Missing resource.
- Unauthorized access.
- System failure path (simulated fault injection).

## 13) UI Functional Coverage

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| UI-001 | Forms submit correctly | Fill and submit each form | Request sent, success state rendered |
| UI-002 | Validation errors show | Submit with missing/invalid fields | Inline and/or summary errors rendered |
| UI-003 | Auth flow success | Valid login from UI | Redirect/login to dashboard succeeds |
| UI-004 | Auth flow failure | Invalid login from UI | Error banner/message displayed |

## 14) API Integration Coverage

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| API-001 | Handles backend success | Mock/real success responses | UI/state updates with parsed data |
| API-002 | Handles backend errors | Mock/real error responses | Error states shown, no unhandled exceptions |

## 15) Performance & Scalability

| ID | Scenario | Method | Expected Result |
|---|---|---|---|
| PERF-001 | Load test | Sustained concurrent requests | Error rate within SLO, latency acceptable |
| PERF-002 | Stress test | Push past expected capacity | Graceful degradation, no data corruption |
| PERF-003 | Scalability | Increase workload tiers | Throughput scales with infrastructure |

## 16) Security Validation

| ID | Scenario | Method | Expected Result |
|---|---|---|---|
| SEC-001 | SQL injection | Injection payloads in inputs | Sanitized/rejected input; no query compromise |
| SEC-002 | Malformed input | Structured fuzz payloads | Controlled `400` responses |
| SEC-003 | Auth bypass | Access protected routes without auth | `401/403`, no data access |
| SEC-004 | Data exposure | Inspect responses/logs/errors | Sensitive fields redacted/not returned |

## 17) Platform & Pipeline Checks

| ID | Scenario | Expected Result |
|---|---|---|
| OPS-001 | Build test | Project compiles successfully |
| OPS-002 | Lint/typecheck | Zero lint and type errors |
| OPS-003 | Test pipeline | CI executes and passes full test suite |
| OPS-004 | Health check | Service reports healthy runtime state |
| OPS-005 | Runtime DB read/write | Live DB roundtrip succeeds in controlled env |
| OPS-006 | Route registry | Endpoint registry matches exposed API |

## Suggested Execution Order

1. Contract and unit tests (response shapes, status codes, roles).
2. Integration tests (auth/session/application workflows).
3. End-to-end UI tests.
4. Security tests.
5. Load/stress/scalability tests.
6. CI + runtime environment validations.
