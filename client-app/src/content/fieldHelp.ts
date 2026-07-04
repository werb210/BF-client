// BF_CLIENT_FIELD_TIPS_v1 - plain-language help for application wizard fields,
// keyed by the EXACT visible label text (trailing "*" is stripped before
// lookup). Edit the strings here; no component changes needed.
export const FIELD_HELP: Record<string, string> = {
  "What are you looking for?": "Pick the closest match. This helps us shortlist the right lenders - you can change it later without starting over.",
  "How much funding are you seeking?": "Your best estimate is fine. Lenders expect a ballpark, not an exact figure.",
  "How much funding are you seeking? - Capital portion only": "Just the working-capital portion. Do not include the equipment cost here - it goes in the field below.",
  "Equipment amount - Equipment Total only": "The full cost of the equipment only. Keep it out of the capital amount above.",
  "How much equipment financing are you seeking?": "Roughly what the equipment costs. A quote or invoice amount works best if you have one.",
  "Equipment amount": "The purchase price of the equipment you want financed, before tax.",
  "Purpose of funds": "One line is enough, e.g. inventory for fall, new truck, payroll bridge. Lenders read this first.",
  "Business Location": "Where the business operates. This decides which lenders and programs are available to you.",
  "Revenue last 12 months": "Total sales over the last 12 months, before expenses. An estimate is fine.",
  "Years of sales history": "How long the business has been generating revenue - not when it was incorporated.",
  "Current AR balance": "Money customers currently owe you (accounts receivable). Enter 0 if you are paid up front.",
  "Fixed assets value for loan security": "Rough value of equipment, vehicles, or property the business owns that could back the loan.",
  "Business Name (DBA)": "The name customers know you by. If you only use your legal name, repeat it here.",
  "Business Legal Name (if applicable)": "The exact name on your incorporation or registration documents.",
  "Business Structure": "Corporation, partnership, or sole proprietorship - it is on your registration paperwork.",
  "Business Address": "The main operating address, not a PO box.",
  "Number of Employees": "Include yourself. Part-timers count.",
  "Ownership %": "Your share of the business. Anyone with 25% or more will be asked to sign.",
  "Date of Birth": "Used for identity verification with the lender. This is not a credit check.",
  "Own or Rent": "Whether you own or rent your home. Some lenders factor this into personal guarantees.",
  "Property Value": "Approximate current market value of your home.",
  "Mortgage Value": "Roughly what is still owing on your mortgage.",
  "Ever filed bankruptcy / proposal?": "Answer honestly - it does not automatically disqualify you, but surprises later will.",
  "Home Address": "Your personal residential address, used for identity verification.",
  "Title / Role": "Your role at the business, e.g. Owner, President, Director.",
  "At this address since": "Roughly when you moved in - month and year is enough.",
  "Director?": "Are you listed as a director on the corporate registry?",
  "Officer?": "Do you hold an officer position, e.g. President, Secretary, Treasurer?",
  "Mailing Address": "Only if different from the address above.",
  "Rehire laid-off (#)": "How many previously laid-off employees this funding would let you bring back. Enter 0 if none.",
  "Retain at-risk (#)": "How many jobs this funding helps you keep. Enter 0 if none.",
};

// Strip decorations before lookup: trailing asterisks and surrounding space.
export function helpForLabel(text: string): string | null {
  const key = text.replace(/\*+\s*$/, "").trim();
  return FIELD_HELP[key] ?? null;
}
