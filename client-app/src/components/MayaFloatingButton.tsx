import { useState } from "react";
import { tokens } from "@/styles";
import MayaClientChat from "./MayaClientChat";

export default function MayaFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: tokens.colors.primary,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 24,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
        aria-label="Open assistant"
      >
        💬
      </button>
    );
  }

  return <MayaClientChat onClose={() => setIsOpen(false)} />;
}
