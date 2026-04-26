import type { ApplicationData as ApplicationDraft } from "@/types/application";

export function normalizeForSubmit(app: ApplicationDraft) {
  const kyc = (app.kyc || {}) as Record<string, any>;
  const business = (app.business || {}) as Record<string, any>;
  const applicantData = (app.applicant || {}) as Record<string, any>;
  const country =
    kyc.businessLocation === "CA" || /Canada/i.test(kyc.businessLocation || "")
      ? "CA"
      : "US";

  const company = {
    name: business.companyName || business.legalName || business.businessName || "",
    dba_name: business.businessName || null,
    legal_name: business.legalName || null,
    business_structure: business.businessStructure || null,
    address_street: business.address || null,
    address_city: business.city || null,
    address_state: business.state || null,
    address_zip: business.zip || null,
    address_country: country,
    phone: business.phone || null,
    website: business.website || null,
    start_date: business.startDate || null,
    employee_count: business.employees ? Number(business.employees) : null,
    estimated_annual_revenue: business.estimatedRevenue
      ? Number(String(business.estimatedRevenue).replace(/[^\d.]/g, ""))
      : null,
  };

  const applicant = {
    first_name: applicantData.firstName || "",
    last_name: applicantData.lastName || "",
    email: applicantData.email || null,
    phone: applicantData.phone || null,
    address_street: applicantData.street || null,
    address_city: applicantData.city || null,
    address_state: applicantData.state || null,
    address_zip: applicantData.zip || null,
    address_country: country,
    dob: applicantData.dob || null,
    ssn: applicantData.ssn || null,
    ownership_percent: applicantData.ownership ? Number(applicantData.ownership) : null,
    role: "applicant" as const,
    is_primary_applicant: true,
  };

  const partner = applicantData.hasMultipleOwners
    ? {
        first_name: applicantData.partnerFirstName || "",
        last_name: applicantData.partnerLastName || "",
        email: applicantData.partnerEmail || null,
        phone: applicantData.partnerPhone || null,
        address_street: applicantData.partnerAddress || null,
        address_city: applicantData.partnerCity || null,
        address_state: applicantData.partnerState || null,
        address_zip: applicantData.partnerZip || null,
        address_country: country,
        dob: applicantData.partnerDob || null,
        ssn: applicantData.partnerSsn || null,
        ownership_percent: applicantData.partnerOwnership
          ? Number(applicantData.partnerOwnership)
          : null,
        role: "partner" as const,
        is_primary_applicant: false,
      }
    : null;

  return {
    company,
    applicant,
    partner,
    kyc: app.kyc,
    product: app.selectedProduct,
    financial: kyc,
  };
}
