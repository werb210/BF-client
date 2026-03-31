import { useState } from "react";
import { sendMayaMessage } from "@/api/maya";

export default function MayaChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role:string; text:string}[]>([]);

  async function send() {
    if (!input) return;

    const msg = input;
    setInput("");

    setMessages((m) => [...m, { role: "user", text: msg }]);

    try {
      const res = await sendMayaMessage(msg);
      const reply = res?.reply || res?.data?.reply || "No response";

      setMessages((m) => [...m, { role: "maya", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "maya", text: "Error" }]);
    }
  }

  return (
    <div>
      <div style={{ height: 200, overflow: "auto" }}>
        {messages.map((m, i) => (
          <div key={i}><b>{m.role}:</b> {m.text}</div>
        ))}
      </div>
      <input value={input} onChange={(e)=>setInput(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}
