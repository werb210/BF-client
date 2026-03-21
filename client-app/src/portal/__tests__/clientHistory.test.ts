import { describe, expect, it } from "vitest";
import { buildClientHistoryEvents } from "../clientHistory";

describe("buildClientHistoryEvents", () => {
  it("orders events chronologically", () => {
    const status = {
      history: [
        { stage: "Documents Under Review", updated_at: "2024-01-02T00:00:00Z" },
        { stage: "Application Submitted", updated_at: "2024-01-01T00:00:00Z" },
      ],
      documents: [
        {
          status: "rejected",
          category: "bank_statement",
          rejected_at: "2024-01-03T00:00:00Z",
          rejection_reason: "Blurry scan",
        },
      ],
      offer: {
        created_at: "2024-01-04T00:00:00Z",
        expires_at: "2024-01-10T00:00:00Z",
      },
    };

    const events = buildClientHistoryEvents({
      status,
      stageLabel: "Application Submitted",
    });

    const timestamps = events.map((event) => event.occurredAt);
    expect(timestamps).toEqual([
      "2024-01-01T00:00:00.000Z",
      "2024-01-02T00:00:00.000Z",
      "2024-01-03T00:00:00.000Z",
      "2024-01-04T00:00:00.000Z",
      "2024-01-10T00:00:00.000Z",
    ]);
  });

  it("redacts internal fields from the timeline", () => {
    const status = {
      history: [
        {
          stage: "Application Submitted",
          updated_at: "2024-02-01T00:00:00Z",
          internal_notes: "secret",
        },
      ],
      documents: [
        {
          status: "rejected",
          category: "license",
          rejected_at: "2024-02-02T00:00:00Z",
          rejection_reason: "Missing page",
          internal_code: "DOC-42",
        },
      ],
    };

    const events = buildClientHistoryEvents({
      status,
      stageLabel: "Application Submitted",
    });

    const allowedKeys = ["id", "type", "title", "detail", "occurredAt"];
    events.forEach((event) => {
      expect(Object.keys(event).every((key) => allowedKeys.includes(key))).toBe(
        true
      );
    });
    expect(JSON.stringify(events)).not.toContain("internal");
  });
});

