export const DefaultBusinessQuestions = {
  businessName: "",
  legalName: "",
  businessAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  website: "",
  startDate: "",
  employees: 1,
  revenue: "",
};

export const DefaultApplicantQuestions = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  dob: "",
  ssn: "",
  ownership: "100", // BF_CLIENT_BLOCK_v158 — prefill 100% (editable)
  hasPartners: false,
  partners: [] as string[],
};
