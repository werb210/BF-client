import { describe, expect, it, vi } from "vitest";
import { runSubmissionFlow } from "../pages/submissionFlow";

vi.mock("../api/applications", () => ({
  createApplication: vi.fn(async () => ({})),
  uploadDocuments: vi.fn(async () => undefined),
  submitApplication: vi.fn(async () => undefined),
}));

describe("runSubmissionFlow hard failure", () => {
  it("fails if applicationId missing", async () => {
    await expect(runSubmissionFlow()).rejects.toThrow();
  });
});
