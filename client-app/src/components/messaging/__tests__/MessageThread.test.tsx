import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageThread, { type ThreadMessage } from "../MessageThread";

const messages: ThreadMessage[] = [
  { id: "1", authorRole: "other", authorName: "John (Boreal)", body: "Hello! Welcome.", createdAt: "2026-04-30T10:00:00Z" },
  { id: "2", authorRole: "self",  authorName: "Todd",          body: "Hi! Where do I start? #networth", createdAt: "2026-04-30T10:05:00Z" },
];

describe("MessageThread (mini-portal)", () => {
  it("client (self) bubbles render on the right; staff (other) on the left", () => {
    render(<MessageThread messages={messages} />);
    const rows = document.querySelectorAll(".msg-row");
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains("msg-row--left")).toBe(true);   // staff
    expect(rows[1].classList.contains("msg-row--right")).toBe(true);  // client
  });

  it("renders #hashtag as a tappable button", () => {
    const onClick = vi.fn();
    render(<MessageThread messages={messages} onHashtagClick={onClick} />);
    const chip = screen.getByRole("button", { name: /networth/i });
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledWith("#networth", "Networth");
  });

  it("renders empty state when no messages", () => {
    render(<MessageThread messages={[]} emptyText="Say hi" />);
    expect(screen.getByText("Say hi")).toBeTruthy();
  });
});
