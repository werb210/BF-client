import { useState } from "react";
import { api } from "@/lib/api";

type ChatMessage = { role: "user" | "assistant"; content: string };

type MayaChatResponse = {
  reply: string;
};

export default function MayaChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function send() {
    const message = input.trim();
    if (!message) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    try {
      const result = await api<MayaChatResponse>("/maya/chat", {
        method: "POST",
        body: { message },
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please try again in a moment.",
        },
      ]);
    }
  }

  return (
    <div>
      <div style={{ height: 200, overflow: "auto" }}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`}>
            <b>{message.role}:</b> {message.content}
          </div>
        ))}
      </div>
      <input value={input} onChange={(event) => setInput(event.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
