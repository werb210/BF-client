import { z } from "zod";

export const ClientAppMessageSchema = z
  .object({
    id: z.string().optional(),
    from: z.string().optional(),
    text: z.string().optional(),
    created_at: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const ClientAppMessagesResponseSchema = z.array(ClientAppMessageSchema);

export const ApplicationDocumentSchema = z
  .object({
    category: z.string().optional(),
    documentType: z.string().optional(),
    document_type: z.string().optional(),
    name: z.string().optional(),
    required: z.boolean().optional(),
    is_required: z.boolean().optional(),
    optional: z.boolean().optional(),
    status: z.string().optional(),
    state: z.string().optional(),
    document_status: z.string().optional(),
    upload_status: z.string().optional(),
    accepted: z.boolean().optional(),
    rejected: z.boolean().optional(),
    file_name: z.string().optional(),
    uploaded_at: z.string().optional(),
    rejection_reason: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
  })
  .passthrough();

export const ApplicationDocumentsResponseSchema = z.union([
  z.array(ApplicationDocumentSchema),
  z
    .object({
      documents: z.array(ApplicationDocumentSchema).optional(),
      document_categories: z.array(ApplicationDocumentSchema).optional(),
    })
    .passthrough(),
]);

export const ApplicationSummarySchema = z
  .object({
    id: z.string().optional(),
    applicationId: z.string().optional(),
    stage: z.string().optional(),
    status: z.string().optional(),
    pipeline_stage: z.string().optional(),
    business: z.record(z.unknown()).optional(),
    business_legal_name: z.string().optional(),
    business_name: z.string().optional(),
    document_review_completed_at: z.string().nullable().optional(),
    documentReviewCompletedAt: z.string().nullable().optional(),
    documents_completed_at: z.string().nullable().optional(),
    ocr_completed_at: z.string().nullable().optional(),
    financial_review_completed_at: z.string().nullable().optional(),
    financialReviewCompletedAt: z.string().nullable().optional(),
    financials_completed_at: z.string().nullable().optional(),
    banking_completed_at: z.string().nullable().optional(),
    expired_at: z.string().nullable().optional(),
    expiredAt: z.string().nullable().optional(),
  })
  .passthrough();

export const FetchApplicationResponseSchema = z.union([
  ApplicationSummarySchema,
  z.object({ application: ApplicationSummarySchema }).passthrough(),
]);

export const OfferTermSheetSchema = z
  .object({
    id: z.string(),
    lender_name: z.string(),
    product_name: z.string(),
    terms: z.record(z.unknown()).nullable().optional(),
    expires_at: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    document_url: z.string().nullable().optional(),
  })
  .passthrough();

export const ApplicationOffersResponseSchema = z
  .object({ offers: z.array(OfferTermSheetSchema) })
  .passthrough();

export const ProcessingCheckpointSchema = z
  .object({
    status: z.string().optional(),
    completedAt: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    receivedCount: z.number().nullable().optional(),
    requiredCount: z.number().nullable().optional(),
    statementCount: z.number().nullable().optional(),
    requiredStatements: z.number().nullable().optional(),
    received_count: z.number().nullable().optional(),
    required_count: z.number().nullable().optional(),
  })
  .passthrough();

export const ProcessingStatusResponseSchema = z
  .object({
    documentReview: ProcessingCheckpointSchema.optional(),
    document_review: ProcessingCheckpointSchema.optional(),
    documents: ProcessingCheckpointSchema.optional(),
    document_processing: ProcessingCheckpointSchema.optional(),
    document: ProcessingCheckpointSchema.optional(),
    financialReview: ProcessingCheckpointSchema.optional(),
    financial_review: ProcessingCheckpointSchema.optional(),
    financials: ProcessingCheckpointSchema.optional(),
    financial_processing: ProcessingCheckpointSchema.optional(),
    financial: ProcessingCheckpointSchema.optional(),
    steps: z.array(ProcessingCheckpointSchema).optional(),
    stages: z.array(ProcessingCheckpointSchema).optional(),
  })
  .passthrough();

export const ClientAppStatusSchema = z
  .object({
    applicationId: z.string().optional(),
    submissionId: z.string().optional(),
    id: z.string().optional(),
    status: z.string().optional(),
    stage: z.string().optional(),
    pipelineStatus: z.string().optional(),
    state: z.string().optional(),
    application: ApplicationSummarySchema.optional(),
    submission: z
      .object({
        id: z.string().optional(),
        status: z.string().optional(),
        updated_at: z.string().nullable().optional(),
        updatedAt: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    financialProfile: z.record(z.unknown()).optional(),
    kyc: z.record(z.unknown()).optional(),
    productCategory: z.string().nullable().optional(),
    product_category: z.string().nullable().optional(),
    business: z.record(z.unknown()).optional(),
    applicant: z.record(z.unknown()).optional(),
    documents: z.record(z.unknown()).optional(),
    documentsDeferred: z.boolean().optional(),
    documents_deferred: z.boolean().optional(),
    selectedProduct: z.unknown().optional(),
    selected_product: z.unknown().optional(),
    selectedProductId: z.string().optional(),
    selected_product_id: z.string().optional(),
    selectedProductType: z.string().optional(),
    selected_product_type: z.string().optional(),
    requires_closing_cost_funding: z.boolean().optional(),
    termsAccepted: z.boolean().optional(),
    terms_accepted: z.boolean().optional(),
    typedSignature: z.string().optional(),
    typed_signature: z.string().optional(),
    coApplicantSignature: z.string().optional(),
    co_applicant_signature: z.string().optional(),
    signatureDate: z.string().optional(),
    signature_date: z.string().optional(),
    currentStep: z.number().optional(),
    current_step: z.number().optional(),
    linkedApplicationTokens: z.array(z.string()).optional(),
    linked_application_tokens: z.array(z.string()).optional(),
    documentReviewComplete: z.boolean().optional(),
    document_review_complete: z.boolean().optional(),
    ocrComplete: z.boolean().optional(),
    ocr_complete: z.boolean().optional(),
    financialReviewComplete: z.boolean().optional(),
    financial_review_complete: z.boolean().optional(),
    creditSummaryComplete: z.boolean().optional(),
    credit_summary_complete: z.boolean().optional(),
    required_documents: z.array(z.string()).optional(),
  })
  .passthrough();

export const ClientAppStatusResponseSchema = z.union([
  ClientAppStatusSchema,
  z.object({ application: ClientAppStatusSchema }).passthrough(),
]);

export const ClientAppStartResponseSchema = z
  .object({ token: z.string() })
  .passthrough();

export const PublicApplicationResponseSchema = z
  .object({
    id: z.string().optional(),
    applicationId: z.string().optional(),
    token: z.string().optional(),
    status: z.string().optional(),
    application: ApplicationSummarySchema.optional(),
  })
  .passthrough();

export const PortalSubmissionSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    updated_at: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .passthrough();

export const PortalSubmissionStatusResponseSchema = z.union([
  z.object({ submission: PortalSubmissionSchema }).passthrough(),
  z
    .object({
      data: z
        .object({
          submission: PortalSubmissionSchema.optional(),
        })
        .passthrough(),
    })
    .passthrough(),
]);

export function parseApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): T {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }
  throw new Error(`Unexpected response from ${context}.`);
}

export const clientApiContract = {
  version: "v1",
  endpoints: {
    "POST /api/applications": {
      responseSchema: { $ref: "#/$defs/PublicApplicationResponse" },
    },
    "GET /api/applications/{id}": {
      responseSchema: { $ref: "#/$defs/FetchApplicationResponse" },
    },
    "GET /api/applications/{id}/documents": {
      responseSchema: { $ref: "#/$defs/ApplicationDocumentsResponse" },
    },
    "POST /api/applications/{id}/documents": {
      responseSchema: { type: "object", additionalProperties: true },
    },
    "GET /api/applications/{id}/offers": {
      responseSchema: { $ref: "#/$defs/ApplicationOffersResponse" },
    },
    "GET /api/applications/{id}/processing/status": {
      responseSchema: { $ref: "#/$defs/ProcessingStatusResponse" },
    },
    "GET /api/portal/applications/{id}": {
      responseSchema: { $ref: "#/$defs/PortalSubmissionStatusResponse" },
    },
    "POST /api/applications/{token}/submit": {
      responseSchema: { type: "object", additionalProperties: true },
    },
    "PATCH /api/applications/{token}": {
      responseSchema: { type: "object", additionalProperties: true },
    },
    "GET /api/applications/{token}/messages": {
      responseSchema: { $ref: "#/$defs/ClientAppMessagesResponse" },
    },
    "POST /api/applications/{token}/messages": {
      responseSchema: { type: "object", additionalProperties: true },
    },
    "GET /api/applications/{token}/signnow": {
      responseSchema: { type: "object", additionalProperties: true },
    },
  },
  $defs: {
    PublicApplicationResponse: {
      type: "object",
      additionalProperties: true,
      properties: {
        id: { type: "string" },
        applicationId: { type: "string" },
        token: { type: "string" },
        status: { type: "string" },
        application: { $ref: "#/$defs/ApplicationSummary" },
      },
    },
    ApplicationSummary: {
      type: "object",
      additionalProperties: true,
      properties: {
        id: { type: "string" },
        applicationId: { type: "string" },
        stage: { type: "string" },
        status: { type: "string" },
        pipeline_stage: { type: "string" },
        business: { type: "object", additionalProperties: true },
        business_legal_name: { type: "string" },
        business_name: { type: "string" },
        document_review_completed_at: { type: ["string", "null"] },
        documentReviewCompletedAt: { type: ["string", "null"] },
        documents_completed_at: { type: ["string", "null"] },
        ocr_completed_at: { type: ["string", "null"] },
        financial_review_completed_at: { type: ["string", "null"] },
        financialReviewCompletedAt: { type: ["string", "null"] },
        financials_completed_at: { type: ["string", "null"] },
        banking_completed_at: { type: ["string", "null"] },
        expired_at: { type: ["string", "null"] },
        expiredAt: { type: ["string", "null"] },
      },
    },
    FetchApplicationResponse: {
      anyOf: [
        { $ref: "#/$defs/ApplicationSummary" },
        {
          type: "object",
          additionalProperties: true,
          properties: {
            application: { $ref: "#/$defs/ApplicationSummary" },
          },
          required: ["application"],
        },
      ],
    },
    ApplicationDocument: {
      type: "object",
      additionalProperties: true,
      properties: {
        category: { type: "string" },
        documentType: { type: "string" },
        document_type: { type: "string" },
        name: { type: "string" },
        required: { type: "boolean" },
        is_required: { type: "boolean" },
        optional: { type: "boolean" },
        status: { type: "string" },
        state: { type: "string" },
        document_status: { type: "string" },
        upload_status: { type: "string" },
        accepted: { type: "boolean" },
        rejected: { type: "boolean" },
        file_name: { type: "string" },
        uploaded_at: { type: "string" },
        rejection_reason: { type: ["string", "null"] },
        rejectionReason: { type: ["string", "null"] },
        reason: { type: ["string", "null"] },
      },
    },
    ApplicationDocumentsResponse: {
      anyOf: [
        { type: "array", items: { $ref: "#/$defs/ApplicationDocument" } },
        {
          type: "object",
          additionalProperties: true,
          properties: {
            documents: {
              type: "array",
              items: { $ref: "#/$defs/ApplicationDocument" },
            },
            document_categories: {
              type: "array",
              items: { $ref: "#/$defs/ApplicationDocument" },
            },
          },
        },
      ],
    },
    OfferTermSheet: {
      type: "object",
      additionalProperties: true,
      required: ["id", "lender_name", "product_name"],
      properties: {
        id: { type: "string" },
        lender_name: { type: "string" },
        product_name: { type: "string" },
        terms: { type: ["object", "null"], additionalProperties: true },
        expires_at: { type: ["string", "null"] },
        status: { type: ["string", "null"] },
        document_url: { type: ["string", "null"] },
      },
    },
    ApplicationOffersResponse: {
      type: "object",
      additionalProperties: true,
      required: ["offers"],
      properties: {
        offers: { type: "array", items: { $ref: "#/$defs/OfferTermSheet" } },
      },
    },
    ProcessingCheckpoint: {
      type: "object",
      additionalProperties: true,
      properties: {
        status: { type: "string" },
        completedAt: { type: ["string", "null"] },
        completed_at: { type: ["string", "null"] },
        receivedCount: { type: ["number", "null"] },
        requiredCount: { type: ["number", "null"] },
        statementCount: { type: ["number", "null"] },
        requiredStatements: { type: ["number", "null"] },
        received_count: { type: ["number", "null"] },
        required_count: { type: ["number", "null"] },
      },
    },
    ProcessingStatusResponse: {
      type: "object",
      additionalProperties: true,
      properties: {
        documentReview: { $ref: "#/$defs/ProcessingCheckpoint" },
        document_review: { $ref: "#/$defs/ProcessingCheckpoint" },
        documents: { $ref: "#/$defs/ProcessingCheckpoint" },
        document_processing: { $ref: "#/$defs/ProcessingCheckpoint" },
        document: { $ref: "#/$defs/ProcessingCheckpoint" },
        financialReview: { $ref: "#/$defs/ProcessingCheckpoint" },
        financial_review: { $ref: "#/$defs/ProcessingCheckpoint" },
        financials: { $ref: "#/$defs/ProcessingCheckpoint" },
        financial_processing: { $ref: "#/$defs/ProcessingCheckpoint" },
        financial: { $ref: "#/$defs/ProcessingCheckpoint" },
        steps: {
          type: "array",
          items: { $ref: "#/$defs/ProcessingCheckpoint" },
        },
        stages: {
          type: "array",
          items: { $ref: "#/$defs/ProcessingCheckpoint" },
        },
      },
    },
    ClientAppMessage: {
      type: "object",
      additionalProperties: true,
      properties: {
        id: { type: "string" },
        from: { type: "string" },
        text: { type: "string" },
        created_at: { type: "string" },
        createdAt: { type: "string" },
      },
    },
    ClientAppMessagesResponse: {
      type: "array",
      items: { $ref: "#/$defs/ClientAppMessage" },
    },
    PortalSubmission: {
      type: "object",
      additionalProperties: true,
      properties: {
        id: { type: "string" },
        status: { type: "string" },
        updated_at: { type: ["string", "null"] },
        updatedAt: { type: ["string", "null"] },
      },
    },
    PortalSubmissionStatusResponse: {
      anyOf: [
        {
          type: "object",
          additionalProperties: true,
          properties: { submission: { $ref: "#/$defs/PortalSubmission" } },
        },
        {
          type: "object",
          additionalProperties: true,
          properties: {
            data: {
              type: "object",
              additionalProperties: true,
              properties: { submission: { $ref: "#/$defs/PortalSubmission" } },
            },
          },
        },
      ],
    },
  },
} as const;
