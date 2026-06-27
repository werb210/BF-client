import { useEffect, useMemo, useState } from "react";
import { Select } from "../components/ui/Select";

// BF_CLIENT_BLOCK_v867_SAFARI_MONTH_PICKER
// <input type="month"> is unsupported in Safari / iOS — it renders as a blank
// text box with no picker, so Accord LOC applicants could not enter "In Business
// Since" / "Fiscal Year-End" in the required YYYY-MM format and were blocked at
// Step 3/4 (Continue never advanced). Two native <select>s work in every browser,
// require no typing, and always emit a valid YYYY-MM string (or "" until both
// parts are chosen) — preserving the exact data contract of the old control.

const MONTHS: Array<[string, string]> = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
];

export function composeYearMonth(year: string, month: string): string {
  return year && month ? `${year}-${month}` : "";
}

type MonthYearSelectProps = {
  value: string; // "YYYY-MM" or ""
  onChange: (value: string) => void;
  ariaLabel: string;
  yearsBack?: number;
  yearsForward?: number;
  id?: string;
  monthOnly?: boolean;
};

function parseYearMonth(value: string): { year: string; month: string } {
  return /^\d{4}-\d{2}$/.test(value || "")
    ? { year: value.slice(0, 4), month: value.slice(5, 7) }
    : { year: "", month: "" };
}

export function MonthYearSelect({
  value,
  onChange,
  ariaLabel,
  yearsBack = 60,
  yearsForward = 0,
  id,
  monthOnly,
}: MonthYearSelectProps) {
  const parsedValue = parseYearMonth(value);
  const [year, setYear] = useState(parsedValue.year);
  const [month, setMonth] = useState(parsedValue.month);

  useEffect(() => {
    const next = parseYearMonth(value);
    setYear(next.year);
    setMonth(next.month);
  }, [value]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: string[] = [];
    for (let y = currentYear + yearsForward; y >= currentYear - yearsBack; y -= 1) {
      options.push(String(y));
    }
    return options;
  }, [yearsBack, yearsForward]);

  if (monthOnly) {
    // BF_CLIENT_AUDIT_FIX_v8 -- fiscal year-end is a recurring month; no year component
    return (
      <Select id={id ? `${id}-month` : undefined} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Month</option>
        {MONTHS.map(([, label]) => (
          <option key={label} value={label}>{label}</option>
        ))}
      </Select>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Select
        id={id ? `${id}-month` : undefined}
        aria-label={`${ariaLabel} month`}
        value={month}
        onChange={(e) => {
          const next = e.target.value;
          setMonth(next);
          onChange(composeYearMonth(year, next));
        }}
      >
        <option value="">Month</option>
        {MONTHS.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        id={id ? `${id}-year` : undefined}
        aria-label={`${ariaLabel} year`}
        value={year}
        onChange={(e) => {
          const next = e.target.value;
          setYear(next);
          onChange(composeYearMonth(next, month));
        }}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
