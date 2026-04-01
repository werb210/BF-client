import type {
  EligibilityCategorySummary,
  EligibilityReasonSummary,
  NormalizedLenderProduct,
} from "../lender/eligibility";

export type SelectedProduct = {
  id: string;
  name: string;
  product_type: string;
  lender_id: string;
};

export interface ApplicationData {
  applicationDraft?: {
    borrower: Record<string, unknown>;
    company: Record<string, unknown>;
    financials: Record<string, unknown>;
    application: Record<string, unknown>;
    documents: Array<Record<string, unknown>>;
  };
  kyc: unknown;
  productCategory: string | null;
  matchPercentages: Record<string, number>;
  eligibleProducts: NormalizedLenderProduct[];
  eligibleCategories: EligibilityCategorySummary[];
  eligibilityReasons: EligibilityReasonSummary[];
  business: unknown;
  applicant: unknown;
  documents: Record<
    string,
    {
      name: string;
      base64: string;
      category: string;
      productId?: string;
      status?: "uploaded" | "accepted" | "rejected";
    }
  >;
  productRequirements?: Record<
    string,
    {
      id: string;
      document_type: string;
      required: boolean;
      min_amount?: number | null;
      max_amount?: number | null;
    }[]
  >;
  documentsDeferred?: boolean;
  selectedProduct?: SelectedProduct;
  selectedProductId?: string;
  selectedProductType?: string;

  requires_closing_cost_funding?: boolean;

  termsAccepted: boolean;
  typedSignature?: string;
  coApplicantSignature?: string;
  signatureDate?: string;
  applicationToken?: string;
  continuationToken?: string;
  readinessSessionToken?: string;
  applicationId?: string;
  currentStep?: number;
  linkedApplicationTokens?: string[];
  documentReviewComplete?: boolean;
  financialReviewComplete?: boolean;
  readinessScore?: number;
  readinessLeadId?: string;
  ocrComplete?: boolean;
  creditSummaryComplete?: boolean;
}

export interface ApplicationPayload {
  businessType: string
  yearsInBusiness: number
  revenue: number
  productType: string
  fundingAmount: number
  businessName: string
  industry: string
  applicantName: string
  email: string
  phone: string
}
