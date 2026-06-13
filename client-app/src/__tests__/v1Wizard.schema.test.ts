import { describe, expect, it } from "vitest";
import {
  step1Schema,
  step3Schema,
  step4Schema,
  toStep1SchemaInput,
  toStep3SchemaInput,
  toStep4SchemaInput,
  V1_CANONICAL_KEYS,
} from "../schemas/v1WizardSchema";
import step1Data from "./__fixtures__/step1.json";
import step3Data from "./__fixtures__/step3.json";
import step4Data from "./__fixtures__/step4.json";
import { getStepFieldKeys } from "../wizard/wizardSchema";

describe("V1 wizard schema locks", () => {
  it("Step1 matches frozen schema", () => {
    expect(step1Schema.parse(step1Data)).toBeTruthy();
  });

  it("Step3 matches frozen schema", () => {
    expect(step3Schema.parse(step3Data)).toBeTruthy();
  });

  it("Step4 matches frozen schema", () => {
    expect(step4Schema.parse(step4Data)).toBeTruthy();
  });

  it("fails if unknown fields are added", () => {
    expect(() =>
      step1Schema.parse({ ...step1Data, extraField: "not-allowed" })
    ).toThrow();
  });

  it("maps existing wizard field names to canonical V1 keys", () => {
    expect(Object.keys(toStep1SchemaInput({
      lookingFor: "Working Capital",
      fundingAmount: "$120000",
      businessLocation: "Canada",
      industry: "Retail",
      purposeOfFunds: "Inventory Purchase",
      salesHistory: "1 to 3 years",
      revenueLast12Months: "$250,000 to $500,000",
      monthlyRevenue: "$25,000 to $50,000",
      accountsReceivable: "Zero to $100,000",
      fixedAssets: "$25,000 to $100,000",
    }))).toEqual(V1_CANONICAL_KEYS.step1);

    expect(Object.keys(toStep3SchemaInput({
      businessName: "Acme",
      legalName: "Acme Inc",
      businessStructure: "Corporation",
      address: "123 Main",
      city: "Toronto",
      state: "ON",
      zip: "M5V 1A1",
      phone: "555-555-5555",
      website: "https://acme.test",
      startDate: "2020-01-01",
      employees: "5",
      estimatedRevenue: "$500000",
    }))).toEqual(V1_CANONICAL_KEYS.step3);

    const mappedStep4 = toStep4SchemaInput({
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      phone: "555",
      street: "123",
      city: "City",
      state: "ON",
      zip: "A1A1A1",
      dob: "1990-01-01",
      ssn: "123",
      ownership: "100",
      hasMultipleOwners: false,
      partner: {},
    });
    expect(Object.keys(mappedStep4.primary)).toEqual(V1_CANONICAL_KEYS.step4Primary);
    expect(Object.keys(mappedStep4.partner)).toEqual(V1_CANONICAL_KEYS.step4Partner);
  });

  it("locks step field order and names for step1/3/4", () => {
    expect(getStepFieldKeys("step1", { kyc: { lookingFor: "Both" } })).toEqual([
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

    expect(
      getStepFieldKeys("step4", { applicant: { hasMultipleOwners: true } })
    ).toEqual([
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
