export function validateApplicationPayload(payload: unknown) {
  const parsed = payload as {
    applicant?: unknown;
    business?: unknown;
    fundingRequest?: unknown;
  } | null;
  if (!parsed) {
    throw new Error("Missing application payload");
  }

  if (!parsed.applicant) {
    throw new Error("Missing applicant data");
  }

  if (!parsed.business) {
    throw new Error("Missing business data");
  }

  if (!parsed.fundingRequest) {
    throw new Error("Missing funding request");
  }

  return true;
}
