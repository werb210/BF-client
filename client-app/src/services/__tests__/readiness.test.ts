// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { fetchReadinessContext, getLeadIdFromSearch } from "../readiness";
import * as apiClient from "@/api/client";

describe("readiness service", () => {
  it("loads readiness lead id from URL", () => {
    expect(getLeadIdFromSearch("?lead=abc-123")).toBe("abc-123");
  });

  it("loads credit readiness id from URL", () => {
    expect(getLeadIdFromSearch("?creditReadinessId=abc-456")).toBe("abc-456");
  });

  it("keeps normal flow unchanged when lead is missing", () => {
    expect(getLeadIdFromSearch("?token=abc")).toBeNull();
  });

  it("returns normalized readiness context", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue({
      readiness: {
        companyName: "Boreal Inc",
        fullName: "Taylor Doe",
        email: "taylor@example.com",
        phone: "+15551234567",
        industry: "Construction",
        yearsInBusiness: 4,
        monthlyRevenue: 120000,
        annualRevenue: 1400000,
        arOutstanding: 250000,
        collateral: true,
      },
    });

    const readiness = await fetchReadinessContext("lead-1");
    expect(readiness).toEqual({
      leadId: "lead-1",
      companyName: "Boreal Inc",
      fullName: "Taylor Doe",
      email: "taylor@example.com",
      phone: "+15551234567",
      industry: "Construction",
      yearsInBusiness: 4,
      monthlyRevenue: 120000,
      annualRevenue: 1400000,
      arOutstanding: 250000,
      collateral: true,
    });
  });

  it("falls back safely when readiness fetch fails", async () => {
    vi.spyOn(apiClient, "apiRequest").mockRejectedValue(new Error("network"));
    const readiness = await fetchReadinessContext("lead-1");
    expect(readiness).toBeNull();
  });
});
