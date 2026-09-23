// BF_CLIENT_MAYA_MARKDOWN_v438
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MayaMessage, toBlocks } from "../mayaMarkdown";

describe("v438 Maya's replies render instead of showing markup", () => {
  it("renders bold instead of asterisks", () => {
    render(<MayaMessage message="**Lines of Credit (LOC)**: $3,000 to $20,000,000" />);
    expect(screen.getByText("Lines of Credit (LOC)").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("renders a link instead of the bracket syntax", () => {
    render(<MayaMessage message="Continue your application [here](https://client.boreal.financial/apply/step-1)." />);
    const link = screen.getByRole("link", { name: "here" });
    expect(link.getAttribute("href")).toBe("https://client.boreal.financial/apply/step-1");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("refuses a non-http scheme rather than linking it", () => {
    render(<MayaMessage message="tap [here](javascript:alert(1)) now" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("breaks an inline numbered run into a real list", () => {
    const blocks = toBlocks("Our rates depend on: 1. Credit Score 2. Time in Business 3. Revenue");
    const ol = blocks.find((b) => b.kind === "ol");
    expect(ol && "items" in ol ? ol.items.length : 0).toBe(3);
  });

  it("handles dashed bullets the same way", () => {
    const blocks = toBlocks("Key features include: - **Quick Access to Funds**: fast - **Flexible Repayment**: varies");
    const ul = blocks.find((b) => b.kind === "ul");
    expect(ul && "items" in ul ? ul.items.length : 0).toBe(2);
  });

  it("leaves an ordinary reply as one paragraph", () => {
    const blocks = toBlocks("Your name is Todd Werboweski. How can I assist you today?");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("p");
  });

  it("never renders raw HTML from the model", () => {
    const { container } = render(<MayaMessage message={'<img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img");
  });

  it("survives an empty message", () => {
    const { container } = render(<MayaMessage message="" />);
    expect(container).toBeTruthy();
  });
});
