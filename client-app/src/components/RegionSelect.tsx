// @ts-nocheck
import { Select } from "./ui/Select";

export function RegionSelect({
  country,
  value,
  onChange,
  id,
  autoComplete = "address-level1", // BF_CLIENT_AUTOFILL_v744 - lets Chrome and Safari fill the province/state
}: {
  country: "CA" | "US";
  value: string;
  onChange: (v: string) => void;
  id?: string;
  autoComplete?: string;
}) {
  const options =
    country === "CA"
      ? [
          "AB",
          "BC",
          "MB",
          "NB",
          "NL",
          "NS",
          "NT",
          "NU",
          "ON",
          "PE",
          "QC",
          "SK",
          "YT",
        ]
      : [
          "AL",
          "AK",
          "AZ",
          "AR",
          "CA",
          "CO",
          "CT",
          "DE",
          "FL",
          "GA",
          "HI",
          "ID",
          "IL",
          "IN",
          "IA",
          "KS",
          "KY",
          "LA",
          "ME",
          "MD",
          "MA",
          "MI",
          "MN",
          "MS",
          "MO",
          "MT",
          "NE",
          "NV",
          "NH",
          "NJ",
          "NM",
          "NY",
          "NC",
          "ND",
          "OH",
          "OK",
          "OR",
          "PA",
          "RI",
          "SC",
          "SD",
          "TN",
          "TX",
          "UT",
          "VT",
          "VA",
          "WA",
          "WV",
          "WI",
          "WY",
        ];

  return (
    <Select
      id={id}
      autoComplete={autoComplete}
      value={value}
      onChange={(e: unknown) => onChange(e.target.value)}
    >
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}

export default RegionSelect;
