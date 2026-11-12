// BF_CLIENT_v953_ID_VERIFY_TODO - an open ID request is a to-do ("What you need to do"), not a button in the chat.
// It is open until the client has sent their pictures; after that there is nothing left for them to do.
import type { SignTodo } from "./signingText";

export type IdRequest = { id: string; status: string };

export function idVerifyTodo(requests: IdRequest[] | null | undefined): SignTodo[] {
  const open = (requests ?? []).some((r) => r.status === "requested" || r.status === "in_progress");
  return open ? [{ key: "id_verify", kind: "action", label: "Verify your identity (a photo of your ID and a selfie)", urgent: false, action: "id_verify" }] : [];
}

/** The chat keeps the advisor's sentence, but the button lives in the to-do list. */
export function chatCtaAction(action: string | null): string | null {
  return action === "id_verify" ? null : action;
}
