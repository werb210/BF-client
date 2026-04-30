import { normalizeEmail, normalizePhone } from "./normalize";

export type SubmitInput = {
  app: Record<string, any>;
};

export function buildSubmitBody(input: SubmitInput) {
  const app = input.app ?? {};
  const business = app.business ?? app.company ?? {};
  const applicant = app.applicant ?? app.borrower ?? {};

  const normalizedBusiness = {
    ...business,
    email: normalizeEmail(business.email),
    phone: normalizePhone(business.phone),
  };
  const normalizedApplicant = {
    ...applicant,
    email: normalizeEmail(applicant.email),
    phone: normalizePhone(applicant.phone),
  };

  return {
    app: {
      ...app,
      business: normalizedBusiness,
      company: normalizedBusiness,
      applicant: normalizedApplicant,
      borrower: normalizedApplicant,
    },
    normalized: {
      company: {
        ...normalizedBusiness,
        name: business.companyName ?? business.name ?? null,
      },
      applicant: {
        ...normalizedApplicant,
        first_name: applicant.firstName ?? applicant.first_name ?? null,
        last_name: applicant.lastName ?? applicant.last_name ?? null,
      },
    },
  };
}
