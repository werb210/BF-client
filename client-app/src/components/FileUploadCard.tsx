import type { ReactNode, HTMLAttributes } from "react";
import { components, tokens } from "@/styles";

type FileUploadCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  status?: string;
  helperText?: string;
  children?: ReactNode;
};

type StatusPill = {
  bg: string;
  fg: string;
  label: string;
};

// BF_CLIENT_BLOCK_v_DOC_STATUS_PILLS_v1 — render the doc status as a colored pill
// (green when added/uploaded, amber when still needed) instead of plain gray text,
// matching the approved Direction A mockup's "✓ Added" / "Needed" pills.
function statusPillStyle(status: string): StatusPill {
  const s = status.toLowerCase();

  if (/uploaded|added|complete|done|received/.test(s) || s.startsWith("✓")) {
    return { bg: "#dcfce7", fg: "#166534", label: status.replace(/^uploaded$/i, "✓ Added") };
  }

  if (/uploading|progress|%/.test(s)) {
    return { bg: "#dbeafe", fg: "#1e40af", label: status };
  }

  if (/missing|required|needed/.test(s)) {
    return { bg: "#fef3c7", fg: "#92400e", label: "Needed" };
  }

  return { bg: tokens.colors.primaryLight, fg: tokens.colors.textSecondary, label: status };
}

export function FileUploadCard({
  title,
  status,
  helperText,
  children,
  ...rest
}: FileUploadCardProps) {
  const pill = status ? statusPillStyle(status) : null;

  return (
    <div style={components.uploadCard.container} {...rest}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: tokens.spacing.sm,
        }}
      >
        <span style={components.uploadCard.title}>{title}</span>
        {pill ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: tokens.radii.pill,
              background: pill.bg,
              color: pill.fg,
              whiteSpace: "nowrap",
            }}
          >
            {pill.label}
          </span>
        ) : null}
      </div>
      {helperText ? <span style={components.uploadCard.meta}>{helperText}</span> : null}
      {children}
    </div>
  );
}
