// BF_CLIENT_v852_CALC_QBO - loan amortization maths. Pure: no React, no network, no clock (the start date is passed in).
//
// Standard amortization: payment = (P - B / (1 + r)^n) * r / (1 - (1 + r)^-n), with P the amount financed (amount
// less the down payment), B the balloon / residual, r the rate per period and n the number of payments. At 0% the
// payment is (P - B) / n. Interest is worked out each period on the balance and rounded to the cent; the last payment
// clears whatever is left (so rounding never leaves a few cents behind) and carries the balloon, if any.

export type Frequency = "monthly" | "biweekly" | "weekly" | "daily";

export const FREQUENCIES: Array<{ id: Frequency; label: string; perYear: number }> = [
  { id: "monthly", label: "Monthly", perYear: 12 },
  { id: "biweekly", label: "Bi-weekly", perYear: 26 },
  { id: "weekly", label: "Weekly", perYear: 52 },
  { id: "daily", label: "Daily (business days)", perYear: 260 },
];

export type LoanInput = {
  amount: number;
  annualRatePct: number;
  termMonths: number;
  frequency: Frequency;
  downPayment?: number;
  balloon?: number;
  /** YYYY-MM-DD. Payments start one period after this date. */
  startDate: string;
};

export type ScheduleRow = { n: number; date: string; payment: number; principal: number; interest: number; balance: number };

export type LoanResult = {
  financed: number;
  downPayment: number;
  balloon: number;
  periodsPerYear: number;
  periodicRate: number;
  numberOfPayments: number;
  paymentPerPeriod: number;
  totalInterest: number;
  totalPayments: number;
  totalCost: number;
  schedule: ScheduleRow[];
};

export const MAX_TERM_MONTHS = 600;

export function round2(n: number): number {
  return Math.round((n + Math.sign(n) * Number.EPSILON) * 100) / 100;
}

export function frequencyInfo(f: Frequency): { id: Frequency; label: string; perYear: number } {
  return FREQUENCIES.find((x) => x.id === f) ?? FREQUENCIES[0]!;
}

/** How many payments a term makes: one a month, or the term's share of 26 / 52 / 260 a year. */
export function paymentCount(termMonths: number, frequency: Frequency): number {
  if (frequency === "monthly") return Math.round(termMonths);
  return Math.max(1, Math.round((termMonths * frequencyInfo(frequency).perYear) / 12));
}

/** Plain-language problems with the inputs; empty when the calculation can run. */
export function validateLoan(input: LoanInput): string[] {
  const errors: string[] = [];
  const ok = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  if (!ok(input.amount) || input.amount <= 0) errors.push("Enter an amount above zero.");
  else if (input.amount > 1e10) errors.push("The amount is too large.");
  if (!ok(input.annualRatePct) || input.annualRatePct < 0 || input.annualRatePct > 100) errors.push("Enter an interest rate from 0 to 100%.");
  if (!ok(input.termMonths) || input.termMonths < 1 || input.termMonths > MAX_TERM_MONTHS || Math.round(input.termMonths) !== input.termMonths) {
    errors.push("Enter a term of 1 to " + MAX_TERM_MONTHS + " whole months.");
  }
  if (!FREQUENCIES.some((f) => f.id === input.frequency)) errors.push("Choose a payment frequency.");
  const down = input.downPayment ?? 0;
  const balloon = input.balloon ?? 0;
  if (!ok(down) || down < 0) errors.push("The down payment cannot be negative.");
  else if (ok(input.amount) && down >= input.amount) errors.push("The down payment must be less than the amount.");
  if (!ok(balloon) || balloon < 0) errors.push("The balloon cannot be negative.");
  else if (ok(input.amount) && ok(down) && balloon >= input.amount - down && input.amount - down > 0) errors.push("The balloon must be less than the amount financed.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || Number.isNaN(Date.parse(input.startDate + "T00:00:00Z"))) errors.push("Choose a start date.");
  return errors;
}

// ---- dates (UTC calendar days, so time zones never shift a payment date) ----
function parseDay(s: string): Date {
  return new Date(s + "T00:00:00Z");
}
function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}
/** The same day k months later, or the month's last day when it is shorter (Jan 31 -> Feb 28). */
export function addMonths(day: string, k: number): string {
  const d = parseDay(day);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + k;
  const target = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return fmtDay(target);
}
function nextBusinessDay(d: Date): Date {
  let x = addDays(d, 1);
  while (x.getUTCDay() === 0 || x.getUTCDay() === 6) x = addDays(x, 1);
  return x;
}

/** Payment dates: one period after the start date, then every period (daily = Monday to Friday). */
export function paymentDates(startDate: string, frequency: Frequency, count: number): string[] {
  const out: string[] = [];
  if (frequency === "monthly") {
    for (let k = 1; k <= count; k++) out.push(addMonths(startDate, k));
    return out;
  }
  if (frequency === "daily") {
    let d = parseDay(startDate);
    for (let k = 1; k <= count; k++) { d = nextBusinessDay(d); out.push(fmtDay(d)); }
    return out;
  }
  const step = frequency === "weekly" ? 7 : 14;
  const start = parseDay(startDate);
  for (let k = 1; k <= count; k++) out.push(fmtDay(addDays(start, step * k)));
  return out;
}

/** The regular payment before rounding. */
export function periodicPayment(financed: number, ratePerPeriod: number, n: number, balloon = 0): number {
  if (n <= 0) return 0;
  if (ratePerPeriod === 0) return (financed - balloon) / n;
  const disc = Math.pow(1 + ratePerPeriod, -n);
  return ((financed - balloon * disc) * ratePerPeriod) / (1 - disc);
}

export function calculateLoan(input: LoanInput): LoanResult {
  const errors = validateLoan(input);
  if (errors.length) throw new Error(errors[0]);
  const down = round2(input.downPayment ?? 0);
  const balloon = round2(input.balloon ?? 0);
  const financed = round2(input.amount - down);
  const info = frequencyInfo(input.frequency);
  const r = input.annualRatePct / 100 / info.perYear;
  const n = paymentCount(input.termMonths, input.frequency);
  const payment = round2(periodicPayment(financed, r, n, balloon));
  const dates = paymentDates(input.startDate, input.frequency, n);

  const schedule: ScheduleRow[] = [];
  let balance = financed;
  let totalInterest = 0;
  let totalPayments = 0;
  for (let k = 1; k <= n; k++) {
    const interest = round2(balance * r);
    let principal: number;
    let pay: number;
    if (k === n) {
      principal = balance; // the last payment clears the balance, balloon included
      pay = round2(interest + principal);
    } else {
      principal = round2(payment - interest);
      pay = payment;
    }
    balance = round2(balance - principal);
    totalInterest = round2(totalInterest + interest);
    totalPayments = round2(totalPayments + pay);
    schedule.push({ n: k, date: dates[k - 1] ?? "", payment: pay, principal: round2(principal), interest, balance: Math.abs(balance) < 0.005 ? 0 : balance });
  }
  return {
    financed, downPayment: down, balloon, periodsPerYear: info.perYear, periodicRate: r, numberOfPayments: n,
    paymentPerPeriod: payment, totalInterest, totalPayments, totalCost: round2(totalPayments + down), schedule,
  };
}

// ---- presenting a result ----

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  const [whole, cents] = Math.abs(round2(n)).toFixed(2).split(".");
  return sign + "$" + (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + (cents ?? "00");
}

export function pct(n: number): string {
  return String(Number(n.toFixed(4))) + "%";
}

/** The summary lines shown on screen, in the PDF and in the saved note. */
export function summaryLines(input: LoanInput, res: LoanResult): Array<[string, string]> {
  const f = frequencyInfo(input.frequency);
  const lines: Array<[string, string]> = [
    ["Amount", money(input.amount)],
    ["Down payment", money(res.downPayment)],
    ["Amount financed", money(res.financed)],
    ["Interest rate", pct(input.annualRatePct) + " a year"],
    ["Term", input.termMonths + " months"],
    ["Payment frequency", f.label],
    ["Payment per period", money(res.paymentPerPeriod)],
    ["Number of payments", String(res.numberOfPayments)],
  ];
  if (res.balloon > 0) lines.push(["Balloon / residual (with the last payment)", money(res.balloon)]);
  lines.push(["Total interest", money(res.totalInterest)], ["Total of payments", money(res.totalPayments)], ["Total cost (payments + down payment)", money(res.totalCost)]);
  return lines;
}

/** The text saved as a note on the application ("Save to file"). */
export function scenarioNote(input: LoanInput, res: LoanResult): string {
  const lines = summaryLines(input, res).map(([k, v]) => k + ": " + v);
  return ["Loan calculator scenario", ...lines, "First payment: " + (res.schedule[0]?.date ?? "") + ", last payment: " + (res.schedule[res.schedule.length - 1]?.date ?? "")].join("\n");
}

function csvCell(v: string | number): string {
  const s = typeof v === "number" ? v.toFixed(2) : v;
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** The spreadsheet download: the summary, a blank line, then the full schedule. */
export function scheduleCsv(input: LoanInput, res: LoanResult): string {
  const rows: string[] = ["Loan amortization schedule"];
  for (const [k, v] of summaryLines(input, res)) rows.push(csvCell(k) + "," + csvCell(v));
  rows.push("", "Payment #,Date,Payment,Principal,Interest,Balance");
  for (const r of res.schedule) rows.push([String(r.n), r.date, csvCell(r.payment), csvCell(r.principal), csvCell(r.interest), csvCell(r.balance)].join(","));
  return rows.join("\r\n") + "\r\n";
}

export function todayLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}
