import { describe, expect, it } from "vitest";
import { runSubmissionFlow } from "../pages/apply/submissionFlow";

describe("runSubmissionFlow", () => {
  it("enforces submission order", async () => {
    const calls: string[] = [];

    const create = async () => calls.push("create");
    const upload = async () => calls.push("upload");
    const submit = async () => calls.push("submit");

    await runSubmissionFlow(create, upload, submit);

    expect(calls).toEqual(["create", "upload", "submit"]);
  });
});
