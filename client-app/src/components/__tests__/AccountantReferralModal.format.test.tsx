// BF_CLIENT_ACCOUNTANT_FORMATTING_v2
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AccountantReferralModal } from "../AccountantReferralModal";

function open(onSubmit = vi.fn()) {
  render(
    <AccountantReferralModal open busy={false} onCancel={vi.fn()} onSubmit={onSubmit} />,
  );
  return onSubmit;
}
const phoneBox = () => screen.getByPlaceholderText("(587) 381-5330") as HTMLInputElement;
const boxes = () => screen.getAllByRole("textbox") as HTMLInputElement[];

describe("accountant referral formatting", () => {
  afterEach(cleanup);

  it("formats the phone as it is typed", () => {
    open();
    fireEvent.change(phoneBox(), { target: { value: "5873815330" } });
    expect(phoneBox().value).toBe("(587) 381-5330");
  });

  it("formats partial entry without fighting the typist", () => {
    open();
    fireEvent.change(phoneBox(), { target: { value: "587" } });
    expect(phoneBox().value).toBe("587");
    fireEvent.change(phoneBox(), { target: { value: "587381" } });
    expect(phoneBox().value).toBe("(587) 381");
  });

  it("drops a leading country code rather than mangling the number", () => {
    open();
    fireEvent.change(phoneBox(), { target: { value: "15873815330" } });
    expect(phoneBox().value).toBe("(587) 381-5330");
  });

  it("sends bare digits, not the display format", () => {
    const onSubmit = open();
    const [firm, contact, email] = boxes();
    fireEvent.change(firm, { target: { value: "Good Guys" } });
    fireEvent.change(contact, { target: { value: "Good Guy" } });
    fireEvent.change(email, { target: { value: "  Todd.W@Example.COM " } });
    fireEvent.change(phoneBox(), { target: { value: "5873815330" } });
    fireEvent.click(screen.getByRole("button", { name: /send to my accountant/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      firm: "Good Guys",
      contact: "Good Guy",
      email: "todd.w@example.com",
      phone: "5873815330",
    });
  });

  it("tidies a name typed entirely in caps", () => {
    const onSubmit = open();
    const [firm, contact, email] = boxes();
    fireEvent.change(firm, { target: { value: "GOOD GUYS ACCOUNTING" } });
    fireEvent.change(contact, { target: { value: "good guy" } });
    fireEvent.change(email, { target: { value: "a@b.ca" } });
    fireEvent.change(phoneBox(), { target: { value: "5873815330" } });
    fireEvent.click(screen.getByRole("button", { name: /send to my accountant/i }));

    expect(onSubmit.mock.calls[0][0].firm).toBe("Good Guys Accounting");
    expect(onSubmit.mock.calls[0][0].contact).toBe("Good Guy");
  });

  it("leaves deliberate mixed case alone", () => {
    const onSubmit = open();
    const [firm, contact, email] = boxes();
    fireEvent.change(firm, { target: { value: "McKenzie LLP" } });
    fireEvent.change(contact, { target: { value: "Ann-Marie O'Dea" } });
    fireEvent.change(email, { target: { value: "a@b.ca" } });
    fireEvent.change(phoneBox(), { target: { value: "5873815330" } });
    fireEvent.click(screen.getByRole("button", { name: /send to my accountant/i }));

    expect(onSubmit.mock.calls[0][0].firm).toBe("McKenzie LLP");
    expect(onSubmit.mock.calls[0][0].contact).toBe("Ann-Marie O'Dea");
  });

  it("refuses a short number, because the accountant signs in with it", () => {
    const onSubmit = open();
    const [firm, contact, email] = boxes();
    fireEvent.change(firm, { target: { value: "Good Guys" } });
    fireEvent.change(contact, { target: { value: "Good Guy" } });
    fireEvent.change(email, { target: { value: "a@b.ca" } });
    fireEvent.change(phoneBox(), { target: { value: "58738" } });
    fireEvent.click(screen.getByRole("button", { name: /send to my accountant/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/10-digit phone number/i)).toBeTruthy();
  });
});
