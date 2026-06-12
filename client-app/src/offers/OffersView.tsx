// @ts-nocheck
import { useMemo } from "react";
import { safeParseDate } from "@/utils/safeDate";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { components, layout, tokens } from "@/styles";

export type OfferTermSheet = {
  id: string;
  lender_name: string;
  product_name: string;
  terms?: Record<string, any> | null;
  expires_at?: string | null;
  status?: unknown;
  document_url?: string | null;
};

export type OffersViewProps = {
  offers: OfferTermSheet[];
  onAcceptOffer?: (offerId: string) => Promise<void> | void;
  onRequestChanges?: (offerId: string) => void;
};

const NEAR_EXPIRY_DAYS = 7;

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = safeParseDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;
  const parsed = safeParseDate(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = parsed.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function extractNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getTermValue(offer: OfferTermSheet, keys: string[]) {
  const terms = offer.terms ?? {};
  for (const key of keys) {
    const raw = (terms as Record<string, any>)[key];
    if (raw !== undefined && raw !== null && raw !== "") {
      return raw;
    }
  }
  return null;
}

function formatRate(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return `${value}%`;
  return String(value);
}

function getRateLabel(offer: OfferTermSheet) {
  const factor = getTermValue(offer, ["factor", "factor_rate", "factorRate"]);
  if (factor) return "Factor";
  return "Rate";
}

function getRateValue(offer: OfferTermSheet) {
  const factor = getTermValue(offer, ["factor", "factor_rate", "factorRate"]);
  if (factor !== null) return factor;
  return getTermValue(offer, ["rate", "interest_rate", "interestRate"]);
}

function getAmountValue(offer: OfferTermSheet) {
  return (
    extractNumber(getTermValue(offer, ["amount", "funding_amount", "principal"])) ??
    extractNumber((offer as unknown).amount)
  );
}

function getTermLength(offer: OfferTermSheet) {
  const raw = getTermValue(offer, ["term", "term_months", "termMonths"]);
  if (raw === null || raw === undefined) return "—";
  return typeof raw === "number" ? `${raw} months` : String(raw);
}

function getStatusLabel(status?: string | null) {
  if (!status) return "Archived";
  const normalized = status.toLowerCase();
  if (normalized === "expired") return "Expired";
  if (normalized === "archived") return "Replaced";
  return "Archived";
}

function getOfferStatus(offer: OfferTermSheet) {
  return (offer.status ?? "").toLowerCase();
}

function TermSheetButton({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        ...components.buttons.base,
        ...components.buttons.primary,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "fit-content",
        textDecoration: "none",
      }}
    >
      View Term Sheet
    </a>
  );
}

function OfferCard({ offer, archived, onAcceptOffer, onRequestChanges }: { offer: OfferTermSheet; archived: boolean; onAcceptOffer?: (offerId: string)=>Promise<void>|void; onRequestChanges?: (offerId: string)=>void; }) {
  const amount = formatCurrency(getAmountValue(offer));
  const termLength = getTermLength(offer);
  const rateValue = formatRate(getRateValue(offer));
  const expiresLabel = formatDate(offer.expires_at ?? undefined);
  const daysUntil = getDaysUntil(offer.expires_at ?? undefined);
  const isExpired =
    getOfferStatus(offer) === "expired" ||
    (daysUntil !== null && daysUntil < 0);
  const isNearExpiry =
    !isExpired && daysUntil !== null && daysUntil <= NEAR_EXPIRY_DAYS;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: tokens.spacing.md,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: tokens.spacing.sm,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={components.form.eyebrow}>{offer.lender_name}</div>
            <div style={components.form.sectionTitle}>{offer.product_name}</div>
          </div>
          {archived ? (
            <span
              style={{
                ...components.form.helperText,
                color: tokens.colors.warning,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {getStatusLabel(offer.status)}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: tokens.spacing.md,
          }}
        >
          <div>
            <div style={components.form.eyebrow}>Amount</div>
            <div style={{ fontWeight: 600 }}>{amount}</div>
          </div>
          <div>
            <div style={components.form.eyebrow}>Term</div>
            <div style={{ fontWeight: 600 }}>{termLength}</div>
          </div>
          <div>
            <div style={components.form.eyebrow}>{getRateLabel(offer)}</div>
            <div style={{ fontWeight: 600 }}>{rateValue}</div>
          </div>
          <div>
            <div style={components.form.eyebrow}>Expires</div>
            <div
              style={{
              fontWeight: 600,
              color: isExpired
                ? tokens.colors.error
                : isNearExpiry
                  ? tokens.colors.warning
                  : "inherit",
            }}
          >
            {expiresLabel}
          </div>
            {isExpired ? (
              <div style={components.form.errorText}>Expired</div>
            ) : isNearExpiry && daysUntil !== null ? (
              <div style={components.form.helperText}>
                {daysUntil <= 0
                  ? "Expires today"
                  : `${daysUntil} day${daysUntil === 1 ? "" : "s"} remaining`}
              </div>
            ) : null}
          </div>
        </div>

        {!archived ? (
          <div style={{ display: "flex", gap: tokens.spacing.sm, flexWrap: "wrap" }}>
            <TermSheetButton url={offer.document_url} />
            <button type="button" style={{ ...components.buttons.base, ...components.buttons.secondary }} onClick={() => onRequestChanges?.(offer.id)}>
              Request Changes
            </button>
            <button type="button" style={{ ...components.buttons.base, ...components.buttons.primary }} onClick={() => onAcceptOffer?.(offer.id)}>
              Accept Offer
            </button>
          </div>
        ) : null}
        {archived ? (
          <div style={components.form.helperText}>
            This term sheet is archived and view-only.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function OffersView({ offers, onAcceptOffer, onRequestChanges }: OffersViewProps) {
  const { active, archived } = useMemo(() => {
    const activeOffers: OfferTermSheet[] = [];
    const archivedOffers: OfferTermSheet[] = [];
    offers.forEach((offer) => {
      const status = getOfferStatus(offer);
      if (status === "active") {
        activeOffers.push(offer);
      } else {
        archivedOffers.push(offer);
      }
    });
    return { active: activeOffers, archived: archivedOffers };
  }, [offers]);

  const hasOffers = offers.length > 0;

  return (
    <div style={layout.page}>
      <div style={layout.portalColumn}>
        <div style={layout.stackTight}>
          <div style={components.form.eyebrow}>Offers</div>
          <h1 style={components.form.title}>Offers</h1>
          <p style={components.form.helperText}>
            {hasOffers
              ? "Review the available offers below."
              : "No offers available yet"}
          </p>
        </div>

        {!hasOffers ? (
          <Card style={{ marginTop: tokens.spacing.lg }}>
            <EmptyState>No offers available yet.</EmptyState>
          </Card>
        ) : null}

        {active.length > 0 ? (
          <section
            style={{
              marginTop: tokens.spacing.lg,
              display: "flex",
              flexDirection: "column",
              gap: tokens.spacing.md,
            }}
            data-testid="active-offers"
          >
            <h2 style={components.form.sectionTitle}>Active offers</h2>
            {active.map((offer) => (
              <OfferCard key={offer.id} offer={offer} archived={false} onAcceptOffer={onAcceptOffer} onRequestChanges={onRequestChanges} />
            ))}
          </section>
        ) : null}

        {archived.length > 0 ? (
          <details
            style={{
              marginTop: tokens.spacing.lg,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radii.md,
              padding: tokens.spacing.md,
            }}
            data-testid="archived-offers"
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "16px",
              }}
            >
              Archived offers
            </summary>
            <div
              style={{
                marginTop: tokens.spacing.md,
                display: "flex",
                flexDirection: "column",
                gap: tokens.spacing.md,
              }}
            >
              {archived.map((offer) => (
                <OfferCard key={offer.id} offer={offer} archived onAcceptOffer={onAcceptOffer} onRequestChanges={onRequestChanges} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
