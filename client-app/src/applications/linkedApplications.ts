import { ClientAppAPI } from "../api/clientApp";
import type { ApplicationData } from "../types/application";

const LINKED_KEY = "boreal_linked_applications";

export type LinkedApplicationRecord = {
  parentToken: string;
  token: string;
  reason: "closing_costs" | "staff_triggered" | "client_initiated";
  createdAt: number;
};

type LinkedApplicationMap = Record<string, LinkedApplicationRecord[]>;

export type LinkedApplicationPayload = {
  parent_application_id?: string;
  linked_application_token: string;
  linked_application_reason: LinkedApplicationRecord["reason"];
  product_category: string;
  requested_amount: number | null;
  kind: "closing_costs";
  financialProfile: ApplicationData["kyc"];
};

export function buildLinkedApplicationPayload(
  parentToken: string,
  kyc: ApplicationData["kyc"],
  reason: LinkedApplicationRecord["reason"],
  parentApplicationId?: string
): LinkedApplicationPayload {
  const profile = (kyc || {}) as Record<string, unknown>;
  const closingCostsRaw = profile.closing_costs_amount;
  const closingCostsAmount =
    typeof closingCostsRaw === "number"
      ? closingCostsRaw
      : typeof closingCostsRaw === "string"
        ? Number.parseFloat(closingCostsRaw)
        : null;

  return {
    ...(parentApplicationId ? { parent_application_id: parentApplicationId } : {}),
    financialProfile: kyc,
    linked_application_token: parentToken,
    linked_application_reason: reason,
    product_category: "EQUIPMENT_FINANCE",
    requested_amount: Number.isFinite(closingCostsAmount as number) ? (closingCostsAmount as number) : null,
    kind: "closing_costs",
  };
}

export function mergeLinkedApplications(
  existing: LinkedApplicationRecord[],
  next: LinkedApplicationRecord
) {
  if (existing.some((record) => record.token === next.token)) {
    return existing;
  }
  return [next, ...existing];
}

function loadLinkedApplications(): LinkedApplicationMap {
  try {
    const raw = localStorage.getItem(LINKED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveLinkedApplications(map: LinkedApplicationMap) {
  try {
    localStorage.setItem(LINKED_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

export const LinkedApplicationStore = {
  list(parentToken: string) {
    const map = loadLinkedApplications();
    return map[parentToken] || [];
  },
  has(parentToken: string) {
    return this.list(parentToken).length > 0;
  },
  add(record: LinkedApplicationRecord) {
    const map = loadLinkedApplications();
    const current = map[record.parentToken] || [];
    const next = mergeLinkedApplications(current, record);
    map[record.parentToken] = next;
    saveLinkedApplications(map);
    return next;
  },
  sync(parentToken: string, tokens: string[]) {
    if (!tokens.length) return this.list(parentToken);
    const map = loadLinkedApplications();
    const existing = map[parentToken] || [];
    const now = Date.now();
    const next = tokens.reduce((acc, token) => {
      const record: LinkedApplicationRecord = {
        parentToken,
        token,
        reason: "staff_triggered",
        createdAt: now,
      };
      return mergeLinkedApplications(acc, record);
    }, existing);
    map[parentToken] = next;
    saveLinkedApplications(map);
    return next;
  },
};

export async function createLinkedApplication(
  parentToken: string,
  kyc: ApplicationData["kyc"],
  reason: LinkedApplicationRecord["reason"] = "closing_costs",
  parentApplicationId?: string
) {
  const payload = buildLinkedApplicationPayload(
    parentToken,
    kyc,
    reason,
    parentApplicationId
  );
  const res = await ClientAppAPI.start(payload);
  const token =
    res?.data?.token ||
    (res?.data as { linked_application_token?: string } | undefined)?.linked_application_token;
  if (!token) {
    throw new Error("Missing linked application token.");
  }
  LinkedApplicationStore.add({
    parentToken,
    token,
    reason,
    createdAt: Date.now(),
  });
  return token;
}
