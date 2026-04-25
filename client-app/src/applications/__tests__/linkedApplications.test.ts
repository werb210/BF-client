import { describe, expect, it } from "vitest";
import {
  buildLinkedApplicationPayload,
  mergeLinkedApplications,
  type LinkedApplicationRecord,
} from "../linkedApplications";

describe("linked applications", () => {
  it("builds a linked application payload with the parent token", () => {
    const payload = buildLinkedApplicationPayload(
      "token-parent",
      { phone: "+1 (555) 222-3333" },
      "closing_costs"
    );
    expect(payload).toEqual({
      financialProfile: { phone: "+1 (555) 222-3333" },
      linked_application_token: "token-parent",
      linked_application_reason: "closing_costs",
      product_category: "EQUIPMENT_FINANCE",
      requested_amount: null,
      kind: "closing_costs",
    });
  });

  it("merges linked applications without duplicating tokens", () => {
    const existing: LinkedApplicationRecord[] = [
      {
        parentToken: "token-parent",
        token: "token-linked",
        reason: "closing_costs",
        createdAt: 1,
      },
    ];
    const next: LinkedApplicationRecord = {
      parentToken: "token-parent",
      token: "token-linked",
      reason: "closing_costs",
      createdAt: 2,
    };
    expect(mergeLinkedApplications(existing, next)).toEqual(existing);
  });
});
