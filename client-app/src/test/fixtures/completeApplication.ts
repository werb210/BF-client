// BF_CLIENT_v789_STEP_GUARD - an application whose Steps 1-4 pass the same
// checks the wizard applies on Continue. Tests take a copy and blank fields.
import type { ApplicationData } from "@/types/application";

export const APP_TOKEN = "11111111-1111-4111-8111-111111111111";

export function completeApplication(overrides: Partial<ApplicationData> = {}): ApplicationData {
  return {
    applicationToken: APP_TOKEN,
    currentStep: 6,
    kyc: {
      lookingFor: "WORKING_CAPITAL",
      fundingAmount: "$100,000",
      businessLocation: "Canada",
      industry: "Retail",
      purposeOfFunds: "Working Capital",
      monthlyRevenue: "$30,001 to $100,000",
      phone: "4035551234",
    },
    productCategory: "LOC",
    selectedProductType: "LOC",
    selectedProductId: "prod-1",
    matchPercentages: {},
    eligibleProducts: [],
    eligibleCategories: [],
    eligibilityReasons: [],
    business: {
      businessName: "Acme Ltd",
      legalName: "Acme Ltd",
      businessStructure: "Corporation",
      address: "100 Business Way",
      city: "Calgary",
      state: "AB",
      zip: "T2P 1A1",
      phone: "4035559876",
      startDate: "2018-01-01",
      employees: "5",
      estimatedRevenue: "500000",
    },
    applicant: {
      firstName: "Taylor",
      lastName: "Doe",
      email: "taylor@example.com",
      phone: "4035551234",
      street: "1 Home St",
      city: "Calgary",
      state: "AB",
      zip: "T2P 2B2",
      dob: "1985-04-02",
      ssn: "046 454 286",
      ownership: "100",
    },
    documents: {},
    productRequirements: {},
    documentsDeferred: true,
    termsAccepted: true,
    shareAuthorization: true,
    infoConfirmed: true,
    typedSignature: "Taylor Doe",
    linkedApplicationTokens: [],
    ...overrides,
  };
}
