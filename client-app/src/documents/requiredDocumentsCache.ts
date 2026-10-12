import { OfflineStore } from "../state/offline";
import type { LenderProductRequirement } from "../wizard/requirements";
import { ensureAlwaysRequiredDocuments, mergeRequirementLists } from "./requiredDocuments";
import { extractRequiredDocumentsFromStatus } from "./requiredDocumentsFromStatus";

export function syncRequiredDocumentsFromStatus(status: unknown) {
  const requiredFromStatus = extractRequiredDocumentsFromStatus(status);
  if (!requiredFromStatus) return null;

  const cached = OfflineStore.load() || {};
  const requirements = (cached.productRequirements || {}) as Record<string, LenderProductRequirement[] | undefined>;
  const existing = requirements.aggregated || [];
  const merged = ensureAlwaysRequiredDocuments(
    mergeRequirementLists(existing, requiredFromStatus)
  );
  OfflineStore.save({
    ...cached,
    productRequirements: {
      ...requirements,
      aggregated: merged,
    },
  });
  return merged;
}
