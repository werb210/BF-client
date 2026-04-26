import { describe, expect, it } from "vitest";
import type { ApplicationData } from "@/types/application";
import { normalizeForSubmit } from "../submitNormalize";

const baseApp = (): ApplicationData =>
  ({
    kyc: {
      businessLocation: "Canada",
    },
    productCategory: null,
    matchPercentages: {},
    eligibleProducts: [],
    eligibleCategories: [],
    eligibilityReasons: [],
    business: {
      companyName: "North Star Logistics",
      businessName: "North Star",
      legalName: "North Star Logistics Inc",
      businessStructure: "corporation",
      address: "1 Main St",
      city: "Toronto",
      state: "ON",
      zip: "M5V 2T6",
      phone: "555-555-1212",
      website: "https://example.com",
      startDate: "2020-01-01",
      employees: "5",
      estimatedRevenue: "$120,000.00",
    },
    applicant: {
      firstName: "Alex",
      lastName: "Nguyen",
      email: "alex@example.com",
      hasMultipleOwners: false,
      ownership: "60",
    },
    documents: {},
    termsAccepted: false,
  } as ApplicationData);

describe("normalizeForSubmit", () => {
  it("normalizes single-owner Canadian payload", () => {
    const normalized = normalizeForSubmit(baseApp());

    expect(normalized.company.address_country).toBe("CA");
    expect(normalized.applicant.role).toBe("applicant");
    expect(normalized.partner).toBeNull();
  });

  it("includes a complete partner object when hasMultipleOwners is true", () => {
    const app = baseApp();
    (app.applicant as Record<string, unknown>).hasMultipleOwners = true;
    (app.applicant as Record<string, unknown>).partnerFirstName = "Taylor";
    (app.applicant as Record<string, unknown>).partnerLastName = "Jordan";
    (app.applicant as Record<string, unknown>).partnerEmail = "taylor@example.com";
    (app.applicant as Record<string, unknown>).partnerPhone = "555-000-9999";
    (app.applicant as Record<string, unknown>).partnerAddress = "2 Queen St";
    (app.applicant as Record<string, unknown>).partnerCity = "Toronto";
    (app.applicant as Record<string, unknown>).partnerState = "ON";
    (app.applicant as Record<string, unknown>).partnerZip = "M5H 2N2";
    (app.applicant as Record<string, unknown>).partnerDob = "1989-03-10";
    (app.applicant as Record<string, unknown>).partnerSsn = "123-45-6789";
    (app.applicant as Record<string, unknown>).partnerOwnership = "40";

    const normalized = normalizeForSubmit(app);

    expect(normalized.partner).toMatchObject({
      first_name: "Taylor",
      last_name: "Jordan",
      role: "partner",
      is_primary_applicant: false,
      ownership_percent: 40,
    });
  });

  it("converts numeric strings for employees and revenue", () => {
    const normalized = normalizeForSubmit(baseApp());

    expect(normalized.company.employee_count).toBe(5);
    expect(normalized.company.estimated_annual_revenue).toBe(120000);
  });
});
