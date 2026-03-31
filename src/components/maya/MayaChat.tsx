import { useState } from "react";
import { chatMaya } from "@/api/maya";

type ChatMessage = { role: "user" | "maya"; text: string };

export default function MayaChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function send() {
    const message = input.trim();
    if (!message) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", text: message }]);

    try {
      const result = await chatMaya(message);

      if (!result.success) {
        setMessages((current) => [
          ...current,
          {
            role: "maya",
            text: result.message || "I hit an issue processing your request.",
          },
        ]);
        return;
      }

      const reply =
        result.data?.reply || "I received your message, but I have no reply yet.";
      setMessages((current) => [...current, { role: "maya", text: reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "maya",
          text: "Network error. Please try again in a moment.",
        },
      ]);
    }
  }

  return (
    <div>
      <div style={{ height: 200, overflow: "auto" }}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`}>
            <b>{message.role}:</b> {message.text}
          </div>
        ))}
      </div>
      <input value={input} onChange={(event) => setInput(event.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
