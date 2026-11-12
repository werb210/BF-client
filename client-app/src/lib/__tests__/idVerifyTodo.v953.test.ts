import { describe, expect, it } from "vitest";
import { chatCtaAction, idVerifyTodo } from "../idVerifyTodo";

describe("ID verification is a to-do", () => {
  it("lists it while the client still has pictures to send", () => {
    expect(idVerifyTodo([{ id: "1", status: "requested" }])).toEqual([expect.objectContaining({ key: "id_verify", action: "id_verify", kind: "action" })]);
    expect(idVerifyTodo([{ id: "1", status: "in_progress" }])).toHaveLength(1);
  });
  it("drops it once the pictures are in, or when nothing was asked for", () => {
    for (const status of ["processing", "review", "approved", "declined", "cancelled", "expired"]) expect(idVerifyTodo([{ id: "1", status }])).toEqual([]);
    expect(idVerifyTodo([])).toEqual([]);
    expect(idVerifyTodo(null)).toEqual([]);
  });
  it("takes the button out of the chat and leaves other buttons alone", () => {
    expect(chatCtaAction("id_verify")).toBeNull();
    expect(chatCtaAction("sign")).toBe("sign");
    expect(chatCtaAction(null)).toBeNull();
  });
});
