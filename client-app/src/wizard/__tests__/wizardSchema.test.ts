import { describe, expect, it } from "vitest";
import { getStepFieldKeys } from "../wizardSchema";

describe("wizardSchema", () => {
  it("orders all 10 step 1 fields for any funding intent", () => {
    const workingCapital = getStepFieldKeys("step1", {
      kyc: { lookingFor: "Working Capital" },
    });
    expect(workingCapital).toEqual([
      "lookingFor",
      "fundingAmount",
      "businessLocation",
      "industry",
      "purposeOfFunds",
      "salesHistory",
      "revenueLast12Months",
      "monthlyRevenue",
      "accountsReceivable",
      "fixedAssets",
    ]);

    const equipment = getStepFieldKeys("step1", {
      kyc: { lookingFor: "Equipment" },
    });
    expect(equipment).toEqual([
      "lookingFor",
      "fundingAmount",
      "businessLocation",
      "industry",
      "purposeOfFunds",
      "salesHistory",
      "revenueLast12Months",
      "monthlyRevenue",
      "accountsReceivable",
      "fixedAssets",
    ]);

    const both = getStepFieldKeys("step1", {
      kyc: { lookingFor: "Both" },
    });
    expect(both).toEqual([
      "lookingFor",
      "fundingAmount",
      "businessLocation",
      "industry",
      "purposeOfFunds",
      "salesHistory",
      "revenueLast12Months",
      "monthlyRevenue",
      "accountsReceivable",
      "fixedAssets",
    ]);

    const undefinedIntent = getStepFieldKeys("step1", { kyc: {} });
    expect(undefinedIntent).toEqual([
      "lookingFor",
      "fundingAmount",
      "businessLocation",
      "industry",
      "purposeOfFunds",
      "salesHistory",
      "revenueLast12Months",
      "monthlyRevenue",
      "accountsReceivable",
      "fixedAssets",
    ]);
  });

  it("orders step 3 fields to match legacy structure", () => {
    expect(getStepFieldKeys("step3", { business: {} })).toEqual([
      "businessName",
      "legalName",
      "businessStructure",
      "address",
      "city",
      "state",
      "zip",
      "phone",
      "website",
      "startDate",
      "employees",
      "estimatedRevenue",
    ]);
  });

  it("includes partner fields only when multiple owners are set", () => {
    const withoutPartner = getStepFieldKeys("step4", {
      applicant: { hasMultipleOwners: false },
    });
    expect(withoutPartner).toEqual([
      "firstName",
      "lastName",
      "email",
      "phone",
      "street",
      "city",
      "state",
      "zip",
      "dob",
      "ssn",
      "ownership",
      "hasMultipleOwners",
    ]);

    const withPartner = getStepFieldKeys("step4", {
      applicant: { hasMultipleOwners: true },
    });
    expect(withPartner).toEqual([
      "firstName",
      "lastName",
      "email",
      "phone",
      "street",
      "city",
      "state",
      "zip",
      "dob",
      "ssn",
      "ownership",
      "hasMultipleOwners",
      "partner.firstName",
      "partner.lastName",
      "partner.email",
      "partner.phone",
      "partner.street",
      "partner.city",
      "partner.state",
      "partner.zip",
      "partner.dob",
      "partner.ssn",
      "partner.ownership",
    ]);
  });
});
