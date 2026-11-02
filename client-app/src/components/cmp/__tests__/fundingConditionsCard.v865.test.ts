// BF_CLIENT_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - the client card's heading.
import { describe, expect, it } from "vitest";
import { conditionsHeading, type ClientCondition } from "../FundingConditionsCard";

const c = (submitted: boolean): ClientCondition => ({ id: String(Math.random()), title: "Void cheque", description: null, due_date: null, status: submitted ? "received" : "open", requires_document: true, submitted });

describe("funding conditions card", () => {
  it("counts what is left to send", () => {
    expect(conditionsHeading([c(false)])).toBe("1 item left before your funding");
    expect(conditionsHeading([c(false), c(false), c(true)])).toBe("2 items left before your funding");
    expect(conditionsHeading([c(true)])).toMatch(/we have everything you sent/);
  });
});
