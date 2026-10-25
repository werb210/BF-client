// BF_CLIENT_v852_CALC_QBO - the "Download PDF" file: the summary and the full schedule on US Letter pages, written directly as a
// small PDF (Helvetica, no library, nothing leaves the device). Text is ASCII; numbers are right-aligned using the
// standard Helvetica character widths.
import { money, summaryLines, type LoanInput, type LoanResult } from "./loanMath";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const ROW_H = 14;

// Helvetica widths (1/1000 em) for the characters used in numbers; everything else uses an average width.
const WIDTHS: Record<string, number> = { "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556, ",": 278, ".": 278, "$": 556, "-": 333, " ": 278, "#": 556 };

export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += WIDTHS[ch] ?? 520;
  return (w * size) / 1000;
}

function esc(s: string): string {
  // ASCII only in the content stream: anything else becomes "?"; escape the PDF string delimiters.
  return s.replace(/[^\x20-\x7e]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

type Op = { font: "F1" | "F2"; size: number; x: number; y: number; text: string; gray?: boolean };

function textOp(o: Op): string {
  const color = o.gray ? "0.35 0.38 0.42 rg" : "0.04 0.12 0.23 rg";
  return "BT " + color + " /" + o.font + " " + o.size + " Tf " + o.x.toFixed(2) + " " + o.y.toFixed(2) + " Td (" + esc(o.text) + ") Tj ET";
}

function lineOp(x1: number, y1: number, x2: number, y2: number): string {
  return "0.75 0.78 0.82 RG 0.6 w " + x1 + " " + y1.toFixed(2) + " m " + x2 + " " + y2.toFixed(2) + " l S";
}

const COLS: Array<{ title: string; right: number; align: "left" | "right" }> = [
  { title: "#", right: MARGIN + 30, align: "right" },
  { title: "Date", right: MARGIN + 46, align: "left" },
  { title: "Payment", right: MARGIN + 220, align: "right" },
  { title: "Principal", right: MARGIN + 310, align: "right" },
  { title: "Interest", right: MARGIN + 400, align: "right" },
  { title: "Balance", right: PAGE_W - MARGIN, align: "right" },
];

function cell(col: (typeof COLS)[number], text: string, y: number, font: "F1" | "F2" = "F1", size = 9): string {
  const x = col.align === "right" ? col.right - textWidth(text, size) : col.right;
  return textOp({ font, size, x, y, text });
}

/** Build the PDF bytes. `title` is the first line (e.g. the business name). */
export function buildSchedulePdf(input: LoanInput, res: LoanResult, title: string, generatedOn: string): Uint8Array {
  const pages: string[][] = [];
  let ops: string[] = [];
  let y = PAGE_H - MARGIN;

  const header = (first: boolean) => {
    if (first) {
      ops.push(textOp({ font: "F2", size: 16, x: MARGIN, y: y - 4, text: "Loan amortization schedule" }));
      y -= 22;
      if (title) { ops.push(textOp({ font: "F1", size: 11, x: MARGIN, y, text: title })); y -= 16; }
      ops.push(textOp({ font: "F1", size: 9, x: MARGIN, y, text: "Prepared " + generatedOn + ". An estimate only: the lender's documents set the actual payments.", gray: true }));
      y -= 20;
      for (const [label, value] of summaryLines(input, res)) {
        ops.push(textOp({ font: "F1", size: 9, x: MARGIN, y, text: label + ":", gray: true }));
        ops.push(textOp({ font: "F2", size: 9, x: MARGIN + 230, y, text: value }));
        y -= ROW_H - 1;
      }
      y -= 10;
    }
    for (const c of COLS) ops.push(cell(c, c.title, y, "F2"));
    ops.push(lineOp(MARGIN, y - 4, PAGE_W - MARGIN, y - 4));
    y -= ROW_H + 2;
  };

  header(true);
  for (const r of res.schedule) {
    if (y < MARGIN + 30) {
      pages.push(ops);
      ops = [];
      y = PAGE_H - MARGIN;
      header(false);
    }
    const values = [String(r.n), r.date, money(r.payment), money(r.principal), money(r.interest), money(r.balance)];
    COLS.forEach((c, i) => ops.push(cell(c, values[i] ?? "", y)));
    y -= ROW_H;
  }
  pages.push(ops);

  // Footer with page numbers.
  pages.forEach((p, i) => p.push(textOp({ font: "F1", size: 8, x: MARGIN, y: MARGIN - 20, text: "Boreal Financial loan calculator - page " + (i + 1) + " of " + pages.length, gray: true })));

  // Objects: 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, then a page and its content stream per page.
  const objects: string[] = [];
  const kids: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((p, i) => {
    const pageId = 5 + i * 2;
    const contentId = pageId + 1;
    kids.push(pageId + " 0 R");
    const stream = p.join("\n");
    objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PAGE_W + " " + PAGE_H + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentId + " 0 R >>";
    objects[contentId] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
  });
  objects[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + pages.length + " >>";

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += id + " 0 obj\n" + objects[id] + "\nendobj\n";
  }
  const xref = out.length;
  out += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let id = 1; id < objects.length; id++) out += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
  out += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}
