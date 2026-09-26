// BF_CLIENT_BLOCK_v550_SHARE_TO_BOREAL
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ShareInbox, { type ShareDeps } from "../ShareInbox";
import { publishShared } from "@/native/sharedFiles";
const deps = (over: Partial<ShareDeps> = {}): ShareDeps => ({
  loadApps: async () => [{ id: "app-1", business_name: "Todd's Gym" }],
  loadItems: async () => [{ key: "upload:tax_returns", kind: "document", label: "Tax returns" }],
  upload: vi.fn(async () => undefined), signedIn: () => true, ...over,
});
describe("v550 share inbox", () => {
  it("stays hidden until a file is shared", () => {
    const { container } = render(<ShareInbox deps={deps()} />);
    expect(container.innerHTML).toBe("");
  });
  it("sends the shared file to the chosen request", async () => {
    const d = deps(); render(<ShareInbox deps={d} />);
    act(() => publishShared([new File(["x"], "T2.pdf", { type: "application/pdf" })]));
    await screen.findByText("T2.pdf");
    await waitFor(() => expect((screen.getByLabelText("What is this?") as HTMLSelectElement).value).toBe("tax_returns"));
    fireEvent.click(screen.getByText("Send"));
    await waitFor(() => expect(d.upload).toHaveBeenCalledWith("app-1", "tax_returns", expect.any(Array)));
    await screen.findByText(/Sent\./);
  });
});
