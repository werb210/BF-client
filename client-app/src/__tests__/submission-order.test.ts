import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSubmissionFlow } from "../pages/submissionFlow";

const calls: string[] = [];

vi.mock("../api/applications", () => ({
  createApplication: vi.fn(async () => {
    calls.push("create");
    return { applicationId: "app-1" };
  }),
  uploadDocuments: vi.fn(async () => {
    calls.push("upload");
  }),
  submitApplication: vi.fn(async () => {
    calls.push("submit");
  }),
}));

describe("runSubmissionFlow", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("enforces submission order", async () => {
    await runSubmissionFlow();

    expect(calls).toEqual(["create", "upload", "submit"]);
  });
});
