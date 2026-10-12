// BF_CLIENT_v789_MAYA_CONVERSATION_TOKEN
// After "Talk to a human", BF-Server v789 returns a visitor_token with the
// conversation_id from POST /api/maya/escalate and requires it, as the
// X-Conversation-Token header, on GET /api/public/conversation/:id/messages and
// POST /api/public/conversation/:id/message. Before v789 the id alone opened
// the thread, so anyone holding (or guessing) an id could read it.
//
// The token is kept in memory and in sessionStorage (this tab only; it is gone
// when the tab closes). A server that predates v789 returns no token, and the
// requests then go out without the header, exactly as before.

export const MAYA_CONVERSATION_KEY = "boreal_maya_conversation";
export const CONVERSATION_TOKEN_HEADER = "X-Conversation-Token";

export type MayaConversation = { conversationId: string; visitorToken: string | null };

let memory: MayaConversation | null = null;

function session(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function saveConversation(conversationId: string, visitorToken?: string | null): MayaConversation {
  const next: MayaConversation = {
    conversationId,
    visitorToken: visitorToken && visitorToken.trim() ? visitorToken.trim() : null,
  };
  memory = next;
  try {
    session()?.setItem(MAYA_CONVERSATION_KEY, JSON.stringify(next));
  } catch {
    /* kept in memory for this page */
  }
  return next;
}

export function loadConversation(): MayaConversation | null {
  if (memory) return memory;
  try {
    const raw = session()?.getItem(MAYA_CONVERSATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MayaConversation>;
    if (!parsed || typeof parsed.conversationId !== "string" || !parsed.conversationId) return null;
    memory = {
      conversationId: parsed.conversationId,
      visitorToken: typeof parsed.visitorToken === "string" && parsed.visitorToken ? parsed.visitorToken : null,
    };
    return memory;
  } catch {
    return null;
  }
}

export function clearConversation(): void {
  memory = null;
  try {
    session()?.removeItem(MAYA_CONVERSATION_KEY);
  } catch {
    /* storage blocked */
  }
}

/** The header for a conversation request; empty when the server issued no token. */
export function conversationHeaders(conversation: MayaConversation | null): Record<string, string> {
  return conversation?.visitorToken ? { [CONVERSATION_TOKEN_HEADER]: conversation.visitorToken } : {};
}

/** 401/403 means the token is missing, expired or not for this conversation. */
export function isConversationAuthError(error: unknown): boolean {
  const status = Number((error as { status?: unknown } | null)?.status ?? 0);
  return status === 401 || status === 403;
}

export const CONVERSATION_ENDED_MESSAGE =
  "This conversation with our team has expired. Tap Talk to a Human to start a new one.";
