import { describe, expect, it } from "vitest";
import { getStepFieldKeys } from "../wizardSchema";

describe("wizardSchema", () => {
  it("orders step 1 fields for each funding intent", () => {
    const workingCapital = getStepFieldKeys("step1", {
      kyc: { lookingFor: "WORKING_CAPITAL" },
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
      kyc: { lookingFor: "EQUIPMENT" },
    });
    expect(equipment).toEqual([
      "lookingFor",
      "equipmentAmount",
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
      kyc: { lookingFor: "BOTH" },
    });
    expect(both).toEqual([
      "lookingFor",
      "equipmentAmount",
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

  it("skips revenue fields for startup applicants", () => {
    expect(getStepFieldKeys("step1", {
      kyc: { lookingFor: "WORKING_CAPITAL", purposeOfFunds: "Start up Funding" },
    })).toEqual([
      // BF_CLIENT_SBA_TEST_PINS_v195 - the SBA / Start-up path asks four questions.
      // Industry, sales history, AR balance and fixed assets came off deliberately:
      // a pre-revenue business cannot answer them, none of them narrows an SBA
      // match, and 51 of 68 applicants were stopping on this screen. Amount and
      // location stay because they decide whether SBA is offered at all.
      "lookingFor",
      "fundingAmount",
      "businessLocation",
      "purposeOfFunds",
    ]);

    expect(getStepFieldKeys("step1", {
      kyc: { lookingFor: "WORKING_CAPITAL", salesHistory: "Zero" },
    })).not.toContain("monthlyRevenue");
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
