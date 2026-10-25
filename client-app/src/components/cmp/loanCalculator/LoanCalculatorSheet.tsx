// BF_CLIENT_v852_CALC_QBO - More -> Loan calculator: the same calculator staff use (amount, rate, term, frequency,
// down payment, balloon; payment, totals and the full schedule; PDF and spreadsheet downloads), in the phone sheet.
// Starts from this application's requested amount. Nothing is sent to Boreal.
import { Sheet } from "../CmpHome";
import LoanCalculator from "./LoanCalculator";
import "../cmp.css";

export default function LoanCalculatorSheet({ requestedAmount, title, onClose }: { requestedAmount?: number | null; title?: string; onClose: () => void }) {
  return (
    <Sheet title="Loan calculator" onClose={onClose} testId="cmp-loan-calculator">
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#51617D" }}>Estimate your payments. Your lender's offer sets the actual terms.</p>
      <LoanCalculator initialAmount={requestedAmount ?? null} title={title} layout="phone" />
    </Sheet>
  );
}
