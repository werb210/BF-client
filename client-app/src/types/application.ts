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

// BF_CLIENT_v789_TYPED_WIZARD_DATA - kyc, business and applicant were typed
// `unknown`, so the six wizard steps carried // @ts-nocheck to read them. Form
// inputs store their text as strings; the index signature keeps the sections
// open for fields added by a single product path (Accord, SBA) without hiding
// the type of the fields every step reads.

/** Step 1 (financial profile) answers. */
export interface KycData {
  [field: string]: unknown;
  lookingFor?: string;
  country?: string;
  fundingAmount?: string;
  requestedAmount?: string;
  equipmentAmount?: string;
  capitalAmount?: string;
  fundingType?: string;
  purposeOfFunds?: string;
  businessLocation?: string;
  industry?: string;
  companyName?: string;
  businessName?: string;
  legalName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  yearsInBusiness?: string;
  salesHistory?: string;
  annualRevenue?: string;
  revenueLast12Months?: string;
  monthlyRevenue?: string;
  accountsReceivable?: string;
  arBalance?: string;
  availableCollateral?: string;
  fixedAssets?: string;
  creditScore?: string;
}

/** Step 3 (business details) answers. */
export interface BusinessData {
  [field: string]: unknown;
  businessName?: string;
  companyName?: string;
  legalName?: string;
  industry?: string;
  estimatedRevenue?: string;
  startDate?: string;
  address?: string;
  city?: string;
  state?: string;
  province?: string;
  zip?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  businessStructure?: string;
}

/** One owner: the applicant, the partner, or an additional shareholder. */
export interface OwnerData {
  [field: string]: unknown;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  homePhone?: string;
  dob?: string;
  ssn?: string;
  sin?: string;
  street?: string;
  city?: string;
  state?: string;
  province?: string;
  zip?: string;
  ownership?: string;
  creditScore?: string;
  creditScoreRange?: string;
  title?: string;
  // Home and mailing address (Accord LOC and SBA Form 912).
  addressSince?: string;
  priorAddress?: string;
  ownRent?: string;
  mortgageBalance?: string;
  propertyValue?: string;
  mailingSameAsPhysical?: boolean;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  // SBA Form 912 / 1919 personal questions.
  formerNames?: string;
  placeOfBirth?: string;
  usCitizen?: string;
  alienRegistrationNumber?: string;
  bankruptcyWhen?: string;
  sex?: string;
  race?: string;
  ethnicity?: string;
  veteranStatus?: string;
  sba912Q8?: string;
  sba912Q8Detail?: string;
  sba912Q9?: string;
  sba912Q9Detail?: string;
  sba912Q10?: string;
  sba912Q10Detail?: string;
  sba912Initials?: string;
}

/** Step 4 answers: the applicant, plus a partner and other shareholders. */
export interface ApplicantData extends OwnerData {
  hasMultipleOwners?: boolean;
  partner?: OwnerData;
  additionalShareholders?: OwnerData[];
}

export interface ApplicationData {
  applicationDraft?: {
    borrower: Record<string, unknown>;
    company: Record<string, unknown>;
    financials: Record<string, unknown>;
    application: Record<string, unknown>;
    documents: Array<Record<string, unknown>>;
  };
  kyc: KycData;
  productCategory: string | null;
  matchPercentages: Record<string, number>;
  eligibleProducts: NormalizedLenderProduct[];
  eligibleCategories: EligibilityCategorySummary[];
  eligibilityReasons: EligibilityReasonSummary[];
  business: BusinessData;
  applicant: ApplicantData;
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
      stage?: number | null;
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
  // BF_CLIENT_BLOCK_v721_TC_CLAUSES_v1 - the other two Step 6 consents.
  shareAuthorization?: boolean;
  infoConfirmed?: boolean;
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
  // BF_CLIENT_BLOCK_v163_PGI_OPT_IN_PAYLOAD_v1
  // Step 6 asks the applicant whether to add PGI (Personal Guarantee
  // Insurance). The value lives in app state already; this declares
  // it on the type so buildSubmissionPayload can include it.
  pgiOptIn?: "yes" | "no";
  // BF_CLIENT_AD_MEASUREMENT_CONSENT_v402 - optional; lets BF-Server send hashed
  // email/phone with Google Ads conversions (enhanced conversions for leads).
  adMeasurementConsent?: boolean;
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
