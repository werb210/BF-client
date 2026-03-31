import { describe, expect, it, vi } from "vitest";
import {
  applicationFields,
  buildPublicApplicationPayload,
  createIdempotencyKey,
  getOrCreateIdempotencyKey,
  handlePublicApplicationSubmit,
  initialValues,
  isSubmissionLocked,
  isSubmissionReady,
  loadPendingSubmissionState,
  loadDraft,
  loadPublicSubmissionState,
  retryPendingPublicSubmission,
  lockSubmission,
  saveDraft,
  unlockSubmission,
  validateApplication,
} from "../PublicApplyPage";

function createStorage(initial: Record<string, string> = {}) {
  let store = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

const requiredFieldNames = [
  "business_legal_name",
  "operating_name",
  "business_address",
  "business_structure",
  "industry",
  "requested_amount",
  "use_of_funds",
  "product_category",
  "contact_name",
  "contact_email",
  "contact_phone",
] as const;

const baseValues = {
  ...initialValues,
  business_legal_name: "Boreal LLC",
  operating_name: "Boreal",
  business_address: "123 Main St",
  years_in_business: "3",
  business_structure: "LLC",
  industry: "Retail",
  requested_amount: "50000",
  use_of_funds: "Inventory",
  product_category: "Working Capital",
  contact_name: "Jane Doe",
  contact_email: "jane@example.com",
  contact_phone: "555-555-5555",
  website_url: "https://boreal.example",
};

describe("PublicApplyPage form schema", () => {
  it("includes all required fields in the schema", () => {
    const fieldNames = applicationFields.map((field) => field.name);
    for (const name of requiredFieldNames) {
      expect(fieldNames).toContain(name);
    }
  });

  it("blocks submission when required fields are missing", () => {
    const errors = validateApplication(initialValues);
    for (const name of requiredFieldNames) {
      expect(errors[name]).toBe("Required");
    }
    expect(errors.years_in_business).toBeDefined();
    expect(errors.start_date).toBeDefined();
  });

  it("requires both consent checkboxes", () => {
    expect(isSubmissionReady(baseValues, null, null)).toBe(false);
    expect(isSubmissionReady(baseValues, "2024-01-01T00:00:00.000Z", null)).toBe(false);
    expect(isSubmissionReady(baseValues, null, "2024-01-01T00:00:00.000Z")).toBe(false);
    expect(
      isSubmissionReady(
        baseValues,
        "2024-01-01T00:00:00.000Z",
        "2024-01-01T00:00:00.000Z"
      )
    ).toBe(true);
  });

  it("builds the canonical payload for the server", () => {
    const payload = buildPublicApplicationPayload(
      baseValues,
      {
        clientIp: "203.0.113.10",
        termsAcceptedAt: "2024-01-01T00:00:00.000Z",
        communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      },
      new Date("2024-01-01T00:00:00.000Z")
    );

    expect(payload).toEqual(
      expect.objectContaining({
        business_legal_name: "Boreal LLC",
        operating_name: "Boreal",
        business_address: "123 Main St",
        start_date: "2021-01-01",
        business_structure: "LLC",
        industry: "Retail",
        requested_amount: 50000,
        use_of_funds: "Inventory",
        product_category: "Working Capital",
        contact_name: "Jane Doe",
        contact_email: "jane@example.com",
        contact_phone: "555-555-5555",
        website_url: "https://boreal.example",
        startup_flag: false,
        terms_accepted_at: "2024-01-01T00:00:00.000Z",
        communications_consent_at: "2024-01-01T00:00:00.000Z",
        client_ip: "203.0.113.10",
      })
    );
  });

  it("sets startup_flag for startup category", () => {
    const payload = buildPublicApplicationPayload(
      {
        ...baseValues,
        product_category: "Startup",
        years_in_business: "1",
      },
      {
        clientIp: "203.0.113.10",
        termsAcceptedAt: "2024-01-01T00:00:00.000Z",
        communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      },
      new Date("2024-01-01T00:00:00.000Z")
    );

    expect(payload.startup_flag).toBe(true);
  });

  it("forwards readiness token and session id when present", async () => {
    const submitApplication = vi.fn().mockResolvedValue({});

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess: vi.fn(),
      onError: vi.fn(),
      storage: createStorage(),
      readinessToken: "readiness-token-1",
      sessionId: "session-1",
    });

    expect(submitApplication).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        readinessToken: "readiness-token-1",
        sessionId: "session-1",
      })
    );
  });

  it("calls submitter and success handler on valid submission", async () => {
    const submitApplication = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const storage = createStorage();

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess,
      onError,
      storage,
      localStorage: storage,
    });

    expect(submitApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        business_legal_name: "Boreal LLC",
        idempotencyToken: expect.any(String),
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("blocks duplicate submissions within a session (including refresh)", async () => {
    const submitApplication = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const storage = createStorage();

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess,
      onError,
      storage,
      localStorage: storage,
    });

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess,
      onError,
      storage,
      localStorage: storage,
    });

    expect(submitApplication).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        form: "This application has already been submitted in this session.",
      })
    );
  });

  it("does not submit when required fields are missing", async () => {
    const submitApplication = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const storage = createStorage();

    await handlePublicApplicationSubmit({
      values: initialValues,
      clientIp: "",
      termsAcceptedAt: null,
      communicationsAcceptedAt: null,
      submitApplication,
      onSuccess,
      onError,
      storage,
    });

    expect(submitApplication).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });


  it("saves and loads drafts", () => {
    const storage = createStorage();
    saveDraft(baseValues, storage as unknown as Storage);
    expect(loadDraft(storage as unknown as Storage)).toEqual(baseValues);
  });

  it("guards submission when cross-tab lock exists", async () => {
    const submitApplication = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const storage = createStorage();

    lockSubmission(storage as unknown as Storage);

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess,
      onError,
      storage,
      localStorage: storage as unknown as Storage,
    });

    expect(submitApplication).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        form: "A submission is already in progress for this browser.",
      })
    );
  });

  it("unlocks submissions after an error", async () => {
    const submitApplication = vi.fn().mockRejectedValue(new Error("boom"));
    const storage = createStorage();

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess: vi.fn(),
      onError: vi.fn(),
      storage,
      localStorage: storage as unknown as Storage,
    });

    expect(isSubmissionLocked(storage as unknown as Storage)).toBe(false);

    lockSubmission(storage as unknown as Storage);
    expect(isSubmissionLocked(storage as unknown as Storage)).toBe(true);
    unlockSubmission(storage as unknown as Storage);
    expect(isSubmissionLocked(storage as unknown as Storage)).toBe(false);
  });

  it("stores a consistent idempotency key for the session", () => {
    const storage = createStorage();
    const key = getOrCreateIdempotencyKey(storage as unknown as Storage);
    expect(loadPublicSubmissionState(storage as unknown as Storage)).toBeNull();
    expect(getOrCreateIdempotencyKey(storage as unknown as Storage)).toBe(key);
    expect(createIdempotencyKey()).toBeTruthy();
  });

  it("persists a pending submission when submit fails", async () => {
    const submitApplication = vi.fn().mockRejectedValue(new Error("offline"));
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage as unknown as Storage);
    vi.stubGlobal("sessionStorage", createStorage() as unknown as Storage);

    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication,
      onSuccess: vi.fn(),
      onError: vi.fn(),
      storage,
      localStorage: storage as unknown as Storage,
    });

    const pending = loadPendingSubmissionState();
    expect(pending).toBeTruthy();
    expect(pending?.retryCount).toBe(0);
    expect(pending?.payload.business_legal_name).toBe("Boreal LLC");
  });

  it("retries pending submission and marks session submitted when successful", async () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage as unknown as Storage);
    vi.stubGlobal("sessionStorage", createStorage() as unknown as Storage);
    await handlePublicApplicationSubmit({
      values: baseValues,
      clientIp: "203.0.113.10",
      termsAcceptedAt: "2024-01-01T00:00:00.000Z",
      communicationsAcceptedAt: "2024-01-01T00:00:00.000Z",
      submitApplication: vi.fn().mockRejectedValue(new Error("offline")),
      onSuccess: vi.fn(),
      onError: vi.fn(),
      storage,
      localStorage: storage as unknown as Storage,
    });

    const retried = await retryPendingPublicSubmission({
      storage: storage as unknown as Storage,
      submitApplication: vi.fn().mockResolvedValue({}),
    });

    expect(retried).toBe(true);
    expect(loadPendingSubmissionState()).toBeNull();
    expect(loadPublicSubmissionState(storage as unknown as Storage)).toBeTruthy();
  });
});
