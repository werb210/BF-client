// BF_CLIENT_NAICS_PICKER_v196
// SBA Form 1919 asks for a 6-digit NAICS code. Almost no owner knows theirs, so a
// bare text box would produce guesses or blanks. This searches BF-Server's
// naics_codes table by title or by code prefix, mirroring bi-server's
// biNaicsRoutes.ts, and stores the code while showing the title back.
//
// Public and unauthenticated by design: it is used before an account exists, and
// it exposes nothing but a US government code list.
import { useEffect, useRef, useState } from "react";
import { components, tokens } from "@/styles";
import { Input } from "../components/ui/Input";

type Row = { code: string; country: string; title: string };

const API = import.meta.env.VITE_API_BASE_URL || "https://server.boreal.financial";

export function NaicsPicker({
  value,
  title,
  country,
  onPick,
}: {
  value: string;
  title?: string;
  country: string;
  onPick: (code: string, title: string) => void;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) {
      setRows([]);
      return;
    }
    // Debounced: an owner types a whole word before they want results, and the
    // server scans the table on every call.
    timer.current = setTimeout(() => {
      setLoading(true);
      fetch(`${API}/api/naics?q=${encodeURIComponent(term)}&country=${encodeURIComponent(country || "US")}`)
        .then((r) => r.json())
        .then((body) => {
          const list = body?.data?.results ?? body?.results ?? [];
          setRows(Array.isArray(list) ? list : []);
          setOpen(true);
        })
        .catch(() => {
          setRows([]);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, country]);

  return (
    <div style={{ position: "relative" }}>
      <Input
        placeholder={value ? `${value} - ${title ?? ""}` : "Search your industry, or type a code"}
        value={q}
        onChange={(e: any) => setQ(e.target.value)}
        onFocus={() => {
          if (rows.length) setOpen(true);
        }}
        autoComplete="off"
      />
      {value ? (
        <div style={{ ...components.form.helperText, marginTop: 4 }}>
          Selected: <strong>{value}</strong>
          {title ? ` - ${title}` : ""}
        </div>
      ) : null}
      {open && (rows.length > 0 || loading) && (
        <div
          style={{
            position: "absolute",
            zIndex: 40,
            left: 0,
            right: 0,
            top: "100%",
            background: "#fff",
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: 8,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(11,31,58,0.12)",
          }}
        >
          {loading && rows.length === 0 ? (
            <div style={{ padding: 10, ...components.form.helperText }}>Searching&hellip;</div>
          ) : null}
          {rows.map((r) => (
            <button
              key={`${r.country}-${r.code}`}
              type="button"
              onClick={() => {
                onPick(r.code, r.title);
                setQ("");
                setRows([]);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: tokens.typography.body.fontSize,
                color: tokens.colors.textPrimary,
              }}
            >
              <strong>{r.code}</strong> &nbsp;{r.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NaicsPicker;
