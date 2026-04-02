import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPublicApplication } from "../../api/applications";
import {
  clearStoredReadinessSession,
  getStoredReadinessToken,
  getReadinessTokenFromUrl,
  resolveReadinessSessionId,
} from "@/api/website";
import { getContinuationSession, fetchContinuation, fetchReadinessSession } from "@/api/continuation";
import { checkContinuation } from "../../services/continuation";
import { getSessionId, trackEvent } from "../../utils/analytics";
import { apiCall } from "@/api/client";
import type { ApiError } from "@/types/api";
import { fundingAmountSchema, emailSchema, phoneSchema } from "@/utils/validationSchema";
import { executeCaptcha } from "@/security/useCaptcha";
import { logClientError } from "@/lib/logger";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";
import {
  clearPendingSubmission,
  getPendingSubmission,
  savePendingSubmission,
} from "@/lib/pendingSubmissionStorage";

type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "select"
  | "url"
  | "textarea";

type FieldConfig = {
  name: keyof ApplicationFormValues;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export type ApplicationFormValues = {
  business_legal_name: string;
  operating_name: string;
  business_address: string;
  years_in_business: string;
  start_date: string;
  business_structure: string;
  industry: string;
  requested_amount: string;
  use_of_funds: string;
  product_category: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
};

export type PublicApplicationPayload = {
  business_legal_name: string;
  operating_name: string;
  business_address: string;
  start_date: string;
  business_structure: string;
  industry: string;
  requested_amount: number;
  use_of_funds: string;
  product_category: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website_url?: string;
  startup_flag: boolean;
  terms_accepted_at: string;
  communications_consent_at: string;
  client_ip: string;
  idempotencyToken?: string;
  captchaToken?: string | null;
};

type PublicSubmissionState = {
  idempotencyKey: string;
  submittedAt: string;
};

type PendingSubmissionState = {
  payload: PublicApplicationPayload;
  idempotencyKey: string;
  createdAt: number;
  retryCount: number;
};

export type MinimalStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

const PUBLIC_SUBMISSION_KEY = "boreal_public_application_submission";
const PUBLIC_IDEMPOTENCY_KEY = "boreal_idempotency";
const DRAFT_KEY = "boreal_application_draft";
const SUBMIT_LOCK_KEY = "boreal_submit_lock";

// ---- Resume Token ----
const RESUME_TOKEN_KEY = "boreal_resume_token";

type DraftPayload = ApplicationFormValues & {
  resumeToken?: string;
};

const productCategories = [
  "Working Capital",
  "Equipment Financing",
  "Startup",
  "Expansion",
  "Bridge",
];

const businessStructures = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation",
  "LLC",
  "Nonprofit",
];

const industries = [
  "Retail",
  "Construction",
  "Hospitality",
  "Healthcare",
  "Professional Services",
  "Other",
];

export const applicationFields: FieldConfig[] = [
  {
    name: "business_legal_name",
    label: "Business legal name",
    type: "text",
    required: true,
  },
  {
    name: "operating_name",
    label: "Operating name",
    type: "text",
    required: true,
  },
  {
    name: "business_address",
    label: "Business address",
    type: "textarea",
    required: true,
  },
  {
    name: "years_in_business",
    label: "Years in business",
    type: "number",
    placeholder: "e.g., 3",
  },
  {
    name: "start_date",
    label: "Business start date",
    type: "date",
  },
  {
    name: "business_structure",
    label: "Business structure",
    type: "select",
    required: true,
    options: businessStructures,
  },
  {
    name: "industry",
    label: "Industry",
    type: "select",
    required: true,
    options: industries,
  },
  {
    name: "requested_amount",
    label: "Requested amount",
    type: "number",
    required: true,
    placeholder: "e.g., 50000",
  },
  {
    name: "use_of_funds",
    label: "Use of funds",
    type: "textarea",
    required: true,
  },
  {
    name: "product_category",
    label: "Product category",
    type: "select",
    required: true,
    options: productCategories,
  },
  {
    name: "contact_name",
    label: "Contact name",
    type: "text",
    required: true,
  },
  {
    name: "contact_email",
    label: "Contact email",
    type: "email",
    required: true,
  },
  {
    name: "contact_phone",
    label: "Contact phone",
    type: "tel",
    required: true,
  },
  {
    name: "website_url",
    label: "Website URL (optional)",
    type: "url",
    placeholder: "https://",
  },
];

const baseFieldNames = applicationFields
  .filter((field) => field.required)
  .map((field) => field.name)
  .filter((field) => field !== "years_in_business" && field !== "start_date");

export const initialValues: ApplicationFormValues = {
  business_legal_name: "",
  operating_name: "",
  business_address: "",
  years_in_business: "",
  start_date: "",
  business_structure: "",
  industry: "",
  requested_amount: "",
  use_of_funds: "",
  product_category: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website_url: "",
};

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage ?? null;
}

const getResumeToken = () => {
  if (typeof window === "undefined") return "";
  const storage = getLocalStorage();
  let token = storage?.getItem(RESUME_TOKEN_KEY) ?? null;
  if (!token) {
    token = crypto.randomUUID();
    storage?.setItem(RESUME_TOKEN_KEY, token);
  }
  return token;
};

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

export function saveDraft(data: DraftPayload, storage: MinimalStorage | null = getLocalStorage()) {
  if (!storage) return;
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // ignore storage failures
  }
}

export function loadDraft(storage: MinimalStorage | null = getLocalStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

export function clearDraft(storage: MinimalStorage | null = getLocalStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // ignore storage failures
  }
}

export function isSubmissionLocked(storage: MinimalStorage | null = getLocalStorage()) {
  if (!storage) return false;
  try {
    return storage.getItem(SUBMIT_LOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export function lockSubmission(storage: MinimalStorage | null = getLocalStorage()) {
  if (!storage) return;
  try {
    storage.setItem(SUBMIT_LOCK_KEY, "true");
  } catch {
    // ignore storage failures
  }
}

export function unlockSubmission(storage: MinimalStorage | null = getLocalStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(SUBMIT_LOCK_KEY);
  } catch {
    // ignore storage failures
  }
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function loadPublicSubmissionState(
  storage: MinimalStorage | null
): PublicSubmissionState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PUBLIC_SUBMISSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicSubmissionState;
    if (!parsed?.idempotencyKey || !parsed?.submittedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePublicSubmissionState(
  storage: MinimalStorage | null,
  state: PublicSubmissionState
) {
  if (!storage) return;
  try {
    storage.setItem(PUBLIC_SUBMISSION_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

export function loadPendingSubmissionState(): PendingSubmissionState | null {
  return getPendingSubmission() as PendingSubmissionState | null;
}

export function savePendingSubmissionState(state: PendingSubmissionState) {
  savePendingSubmission(state);
}

export function clearPendingSubmissionState() {
  clearPendingSubmission();
}

export function loadIdempotencyKey(storage: MinimalStorage | null) {
  if (!storage) return null;
  try {
    return storage.getItem(PUBLIC_IDEMPOTENCY_KEY);
  } catch {
    return null;
  }
}

export function getOrCreateIdempotencyKey(storage: MinimalStorage | null) {
  const existing = loadIdempotencyKey(storage);
  if (existing) return existing;
  const next = createIdempotencyKey();
  if (storage) {
    try {
      storage.setItem(PUBLIC_IDEMPOTENCY_KEY, next);
    } catch {
      // ignore storage failures
    }
  }
  return next;
}

function getRevenueTier(requestedAmount: string) {
  const amount = Number(requestedAmount);
  if (!Number.isFinite(amount) || amount <= 0) return "low" as const;
  if (amount >= 150000) return "high" as const;
  if (amount >= 50000) return "medium" as const;
  return "low" as const;
}

export function validateApplication(values: ApplicationFormValues) {
  const errors: Record<string, string> = {};

  for (const field of baseFieldNames) {
    if (!values[field]?.trim()) {
      errors[field] = "Required";
    }
  }

  const hasYears = Number(values.years_in_business) > 0;
  const hasStartDate = Boolean(values.start_date);
  if (!hasYears && !hasStartDate) {
    errors.years_in_business = "Provide years in business or a start date";
    errors.start_date = "Provide years in business or a start date";
  }

  if (values.contact_email) {
    const emailResult = emailSchema.safeParse(values.contact_email);
    if (!emailResult.success) {
      errors.contact_email = emailResult.error.issues[0]?.message || "Invalid email address";
    }
  }

  if (values.contact_phone) {
    const phoneResult = phoneSchema.safeParse(values.contact_phone.replace(/[-()\s]/g, ""));
    if (!phoneResult.success) {
      errors.contact_phone = phoneResult.error.issues[0]?.message || "Invalid phone number";
    }
  }

  if (values.requested_amount) {
    const amountResult = fundingAmountSchema.safeParse(Number(values.requested_amount));
    if (!amountResult.success) {
      errors.requested_amount = amountResult.error.issues[0]?.message || "Invalid funding amount";
    }
  }

  return errors;
}

function deriveStartDate(values: ApplicationFormValues, now = new Date()) {
  if (values.start_date) {
    return values.start_date;
  }

  const years = Number(values.years_in_business);
  if (!Number.isFinite(years) || years <= 0) {
    return "";
  }

  const startYear = now.getFullYear() - Math.floor(years);
  return `${startYear}-01-01`;
}

function deriveYearsInBusiness(values: ApplicationFormValues, now = new Date()) {
  if (values.years_in_business) {
    return Number(values.years_in_business);
  }

  if (!values.start_date) {
    return 0;
  }

  const startYear = new Date(values.start_date).getFullYear();
  return Math.max(0, now.getFullYear() - startYear);
}

export function buildPublicApplicationPayload(
  values: ApplicationFormValues,
  meta: { clientIp: string; termsAcceptedAt: string; communicationsAcceptedAt: string },
  now = new Date()
): PublicApplicationPayload {
  const startDate = deriveStartDate(values, now);
  const normalizedYears = deriveYearsInBusiness(values, now);
  const productCategory = values.product_category.trim();
  const websiteUrl = values.website_url.trim();

  return {
    business_legal_name: values.business_legal_name.trim(),
    operating_name: values.operating_name.trim(),
    business_address: values.business_address.trim(),
    start_date: startDate || `${now.getFullYear()}-01-01`,
    business_structure: values.business_structure.trim(),
    industry: values.industry.trim(),
    requested_amount: Number(values.requested_amount),
    use_of_funds: values.use_of_funds.trim(),
    product_category: productCategory,
    contact_name: values.contact_name.trim(),
    contact_email: values.contact_email.trim(),
    contact_phone: values.contact_phone.trim(),
    website_url: websiteUrl || undefined,
    startup_flag: productCategory.toLowerCase() === "startup" && normalizedYears <= 2,
    terms_accepted_at: meta.termsAcceptedAt,
    communications_consent_at: meta.communicationsAcceptedAt,
    client_ip: meta.clientIp,
  };
}

export function isSubmissionReady(
  values: ApplicationFormValues,
  termsAcceptedAt: string | null,
  communicationsAcceptedAt: string | null
) {
  const errors = validateApplication(values);
  return (
    Object.keys(errors).length === 0 && Boolean(termsAcceptedAt) && Boolean(communicationsAcceptedAt)
  );
}

export async function handlePublicApplicationSubmit({
  values,
  clientIp,
  termsAcceptedAt,
  communicationsAcceptedAt,
  submitApplication,
  onSuccess,
  onError,
  storage,
  localStorage,
  readinessToken,
  sessionId,
  captchaToken,
}: {
  values: ApplicationFormValues;
  clientIp: string;
  termsAcceptedAt: string | null;
  communicationsAcceptedAt: string | null;
  submitApplication: (
    payload: PublicApplicationPayload,
    options: { idempotencyKey: string; readinessToken?: string | null; sessionId?: string | null }
  ) => Promise<any>;
  onSuccess: () => void;
  onError: (errors: Record<string, string>) => void;
  storage?: MinimalStorage | null;
  localStorage?: MinimalStorage | null;
  readinessToken?: string | null;
  sessionId?: string | null;
  captchaToken?: string | null;
}) {
  const resolvedReadinessToken = readinessToken || null;
  const resolvedSessionId = sessionId || null;
  const errors = validateApplication(values);
  if (!termsAcceptedAt) {
    errors.terms = "Acceptance required";
  }
  if (!communicationsAcceptedAt) {
    errors.communications = "Acceptance required";
  }

  if (Object.keys(errors).length > 0) {
    onError(errors);
    return;
  }

  if (!termsAcceptedAt || !communicationsAcceptedAt) {
    onError({
      terms: "Acceptance required",
      communications: "Acceptance required",
    });
    return;
  }

  const resolvedLockStorage = localStorage ?? getLocalStorage();
  const submissionState = loadPublicSubmissionState(storage ?? null);
  if (submissionState) {
    onError({
      form: "This application has already been submitted in this session.",
    });
    return;
  }

  if (isSubmissionLocked(resolvedLockStorage)) {
    onError({
      form: "A submission is already in progress for this browser.",
    });
    return;
  }

  lockSubmission(resolvedLockStorage);

  const payload = buildPublicApplicationPayload(values, {
    clientIp,
    termsAcceptedAt,
    communicationsAcceptedAt,
  });

  const idempotencyKey = getOrCreateIdempotencyKey(storage ?? null);
  payload.idempotencyToken = idempotencyKey;
  payload.captchaToken = captchaToken ?? null;
  savePendingSubmissionState({
    payload,
    idempotencyKey,
    createdAt: Date.now(),
    retryCount: 0,
  });

  if (getRevenueTier(values.requested_amount) === "high") {
    trackEvent("high_value_submission_attempt", {
      session_id: getSessionId(),
    });
  }

  try {
    await submitApplication(payload, {
      idempotencyKey,
      readinessToken: resolvedReadinessToken,
      sessionId: resolvedSessionId,
    });
    savePublicSubmissionState(storage ?? null, {
      idempotencyKey,
      submittedAt: new Date().toISOString(),
    });
    clearPendingSubmissionState();
    clearDraft();
    onSuccess();
  } catch (error: unknown) {
    try {
      logClientError(error);
    } catch {
      // swallow in test env
    }
    unlockSubmission(resolvedLockStorage);
    const apiError = error as ApiError;
    const responseData = apiError.response?.data;
    const responsePayload =
      responseData && typeof responseData === "object"
        ? (responseData as { errors?: unknown; error?: unknown; message?: unknown })
        : null;
    const serverErrors =
      responsePayload?.errors ||
      responsePayload?.error ||
      responsePayload?.message ||
      null;
    if (serverErrors && typeof serverErrors === "object") {
      onError(serverErrors as Record<string, string>);
    } else if (typeof serverErrors === "string") {
      onError({ form: serverErrors });
    } else {
      onError({
        form: "We couldn't submit your application. Your data is saved locally and we'll retry when you're back online.",
      });
    }
  }
}

export async function retryPendingPublicSubmission({
  storage,
  submitApplication,
}: {
  storage: MinimalStorage | null;
  submitApplication: (
    payload: PublicApplicationPayload,
    options: { idempotencyKey: string; readinessToken?: string | null; sessionId?: string | null }
  ) => Promise<any>;
}) {
  const pendingSubmission = loadPendingSubmissionState();
  if (!pendingSubmission) return false;
  try {
    await submitApplication(pendingSubmission.payload as PublicApplicationPayload, {
      idempotencyKey: pendingSubmission.idempotencyKey,
    });
    savePublicSubmissionState(storage, {
      idempotencyKey: pendingSubmission.idempotencyKey,
      submittedAt: new Date().toISOString(),
    });
    clearPendingSubmissionState();
    return true;
  } catch {
    pendingSubmission.retryCount += 1;
    savePendingSubmissionState({
      ...pendingSubmission,
      payload: pendingSubmission.payload as PublicApplicationPayload,
    });
    return false;
  }
}

export default function PublicApplyPage() {
  const [values, setValues] = useState<ApplicationFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientIp, setClientIp] = useState<string>("");
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [communicationsAcceptedAt, setCommunicationsAcceptedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydratingContinuation, setIsHydratingContinuation] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [submissionState, setSubmissionState] = useState<PublicSubmissionState | null>(
    () => loadPublicSubmissionState(getSessionStorage())
  );
  const [retryNotice, setRetryNotice] = useState<string>("");
  const navigate = useNavigate();
  const readinessToken = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getReadinessTokenFromUrl(window.location.search) || getStoredReadinessToken();
  }, []);
  const readinessSessionId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return resolveReadinessSessionId(window.location.search);
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setValues((prev) => ({ ...prev, ...draft }));
    }
  }, []);

  useEffect(() => {
    const draftPayload = {
      ...values,
      resumeToken: getResumeToken(),
    };

    saveDraft(draftPayload);
  }, [values]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const draft = loadDraft();
      if (!draft) return;

      await apiCall(API_ENDPOINTS_CONTRACT.DRAFTS.SAVE, {
        method: "POST",
        body: JSON.stringify(draft),
      }).catch((error) => {
        try {
          logClientError(error);
        } catch {
          // swallow in test env
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const resumeToken = url.searchParams.get("resume");

    if (!resumeToken) return;

    void (apiCall(`${API_ENDPOINTS_CONTRACT.DRAFTS.PREFIX}${resumeToken}`) as Promise<DraftPayload | null>)
      .then((data: DraftPayload | null) => {
        if (data) {
          setValues((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((error) => {
        try {
          logClientError(error);
        } catch {
          // swallow in test env
        }
      });
  }, []);

  useEffect(() => {
    const continuationId = readinessSessionId || readinessToken;
    if (!continuationId) return;

    let active = true;
    setIsHydratingContinuation(true);

    const loadContinuationData = readinessSessionId
      ? fetchReadinessSession(readinessSessionId)
      : fetchContinuation(continuationId);

    void loadContinuationData
      .then((data) => {
        if (!active || !data) return;
        setContinuing(true);
        setValues((prev) => ({
          ...prev,
          business_legal_name: data.companyName || prev.business_legal_name,
          operating_name: data.companyName || prev.operating_name,
          industry: data.industry || prev.industry,
          contact_name: data.fullName || prev.contact_name,
          contact_email: data.email || prev.contact_email,
          contact_phone: data.phone || prev.contact_phone,
          years_in_business:
            typeof data.yearsInBusiness === "number"
              ? String(data.yearsInBusiness)
              : prev.years_in_business,
        }));
      })
      .finally(() => {
        if (active) {
          setIsHydratingContinuation(false);
        }
      });

    return () => {
      active = false;
    };
  }, [readinessSessionId, readinessToken]);

  useEffect(() => {
    const draftId = localStorage.getItem("boreal_draft_applicationId");
    if (draftId) {
      window.location.href = `/apply/${draftId}`;
    }
  }, []);

  useEffect(() => {
    const email = localStorage.getItem("boreal_email");

    if (!email) return;

    void checkContinuation(email).then((data) => {
      if (!data?.pendingApplicationId) return;

      navigate(`/apply/${data.pendingApplicationId}`);
    });
  }, [navigate]);

  useEffect(() => {
    async function checkContinuation() {
      try {
        const session = await getContinuationSession();
        if (session?.applicationId) {
          navigate(`/apply/${session.applicationId}`);
        }
      } catch {
        // no-op when continuation session is unavailable
      }
    }

    void checkContinuation();
  }, [navigate]);

  useEffect(() => {
    setClientIp("");
  }, []);

  const canSubmit = useMemo(
    () => isSubmissionReady(values, termsAcceptedAt, communicationsAcceptedAt) && !isSubmitting && !isHydratingContinuation,
    [values, termsAcceptedAt, communicationsAcceptedAt, isSubmitting, isHydratingContinuation]
  );

  const handleChange = (name: keyof ApplicationFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionState) {
      setErrors({
        form: "This application has already been submitted in this session.",
      });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const captchaToken = await executeCaptcha();
      try {
        await handlePublicApplicationSubmit({
          values,
          clientIp,
          termsAcceptedAt,
          communicationsAcceptedAt,
          submitApplication: createPublicApplication,
          onSuccess: () => {
            clearStoredReadinessSession();
            navigate("/apply/success");
          },
          onError: (nextErrors) => setErrors(nextErrors),
          storage: getSessionStorage(),
          localStorage: getLocalStorage(),
          readinessToken,
          sessionId: readinessSessionId,
          captchaToken,
        });
        setIsSubmitting(false);
      } catch (err) {
        try {
          logClientError(err);
        } catch {
          // swallow in test env
        }
        setErrors({ form: "Submission failed" });
        setIsSubmitting(false);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setSubmissionState(loadPublicSubmissionState(getSessionStorage()));
  }, [isSubmitting]);

  useEffect(() => {
    const sessionStorage = getSessionStorage();
    const pending = loadPendingSubmissionState();
    if (!pending) return;
    setRetryNotice("We saved your previous submission and are retrying automatically.");

    const attemptRetry = async () => {
      const submitted = await retryPendingPublicSubmission({
        storage: sessionStorage,
        submitApplication: createPublicApplication,
      });
      if (submitted) {
        setRetryNotice("");
        setSubmissionState(loadPublicSubmissionState(sessionStorage));
        navigate("/apply/success");
      }
    };

    void attemptRetry();
    const onOnline = () => {
      void attemptRetry();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [navigate]);

  return (
    <main style={{ padding: "32px", maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
        Boreal Financial Application
      </h1>
      <p style={{ marginBottom: 24, color: "rgb(75 85 99)" }}>
        Complete the form below to submit your application. All required fields must be filled in.
      </p>

      {isHydratingContinuation ? <p style={{ marginBottom: 16, color: "rgb(75 85 99)" }}>Loading your application context...</p> : null}
      {retryNotice ? (
        <p style={{ marginBottom: 16, color: "rgb(180 83 9)", fontWeight: 600 }}>{retryNotice}</p>
      ) : null}

      {submissionState ? (
        <section
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "rgb(249 250 251)",
            display: "grid",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Application submitted</h2>
          <p style={{ color: "rgb(75 85 99)" }}>
            This application was already submitted in this browser session. You can
            continue to the confirmation page or start a new application.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/apply/success")}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "rgb(17 24 39)",
                color: "white",
                fontWeight: 600,
              }}
            >
              View confirmation
            </button>
            <button
              type="button"
              onClick={() => {
                getSessionStorage()?.removeItem(PUBLIC_SUBMISSION_KEY);
                getSessionStorage()?.removeItem(PUBLIC_IDEMPOTENCY_KEY);
                unlockSubmission();
                clearDraft();
                setSubmissionState(null);
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
                color: "rgb(17 24 39)",
                fontWeight: 600,
              }}
            >
              Start a new application
            </button>
          </div>
        </section>
      ) : null}

      {continuing ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #dbeafe",
            background: "rgb(239 246 255)",
            color: "rgb(29 78 216)",
            fontWeight: 600,
          }}
        >
          Continuing your application
        </div>
      ) : null}


      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>

        {errors.form ? (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "rgb(254 242 242)",
              color: "rgb(185 28 28)",
              fontWeight: 600,
            }}
          >
            {errors.form}
          </div>
        ) : null}
        {applicationFields.map((field) => {
          const value = values[field.name];
          const error = errors[field.name];

          return (
            <label key={field.name} style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.type === "select" ? (
                <select
                  value={value}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  style={{ padding: "10px", borderRadius: 6, border: "1px solid #d1d5db" }}
                >
                  <option value="">Select one</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  style={{ padding: "10px", borderRadius: 6, border: "1px solid #d1d5db" }}
                  rows={3}
                />
              ) : (
                <input
                  type={field.type}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  style={{ padding: "10px", borderRadius: 6, border: "1px solid #d1d5db" }}
                />
              )}
              {error ? <span style={{ color: "rgb(185 28 28)" }}>{error}</span> : null}
            </label>
          );
        })}

        <section
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "rgb(249 250 251)",
            display: "grid",
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Document uploads</h2>
          <p style={{ color: "rgb(75 85 99)" }}>
            After submitting, we’ll request unknown documents needed to complete your
            review. You’ll be notified when uploads are ready.
          </p>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={Boolean(termsAcceptedAt)}
              onChange={(event) =>
                setTermsAcceptedAt(event.target.checked ? new Date().toISOString() : null)
              }
            />
            <span>
              I accept the Boreal Financial and Boreal Industries Terms of Service and authorize
              Boreal Financial to act on my behalf.
            </span>
          </label>
          {errors.terms ? <span style={{ color: "rgb(185 28 28)" }}>{errors.terms}</span> : null}

          <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={Boolean(communicationsAcceptedAt)}
              onChange={(event) =>
                setCommunicationsAcceptedAt(event.target.checked ? new Date().toISOString() : null)
              }
            />
            <span>
              I consent to receive communications via phone, SMS, and email messaging.
            </span>
          </label>
          {errors.communications ? (
            <span style={{ color: "rgb(185 28 28)" }}>{errors.communications}</span>
          ) : null}
        </section>

        <button
          type="submit"
          disabled={!canSubmit || Boolean(submissionState)}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            border: "none",
            background: canSubmit && !submissionState ? "rgb(17 24 39)" : "rgb(156 163 175)",
            color: "white",
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit application"}
        </button>
        <p style={{ color: "rgb(107 114 128)", fontSize: 12 }}>
          Client IP captured: {clientIp || "Unavailable"}
        </p>
      </form>
    </main>
  );
}
