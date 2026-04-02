import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { acceptApplicationOffer, fetchApplicationOffers } from "@/api/applications";
import { OffersView } from "@/offers/OffersView";
import { components, layout } from "@/styles";
import { retry } from "@/utils/retry";
import type { OfferTermSheet } from "@/offers/OffersView";

export function ApplicationOffersPage(): JSX.Element {
  const { id } = useParams();
  const [offers, setOffers] = useState<OfferTermSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);


  const loadOffers = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await retry(() => fetchApplicationOffers(id));
      setOffers((response as { offers?: OfferTermSheet[] })?.offers ?? []);
    } catch {
      setError("We couldn't load your offers yet. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await loadOffers();
    })();
    return () => {
      active = false;
    };
  }, [loadOffers]);

  const handleAcceptOffer = useCallback(async (offerId: string) => {
    try {
      setActionError(null);
      await acceptApplicationOffer(offerId);
      await loadOffers();
    } catch {
      setActionError("Unable to accept this offer right now. Please try again.");
    }
  }, [loadOffers]);

  if (loading) {
    return (
      <div style={layout.page}>
        <div style={layout.portalColumn}>
          <div style={components.form.sectionTitle}>Loading offers…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={layout.page}>
        <div style={layout.portalColumn}>
          <div style={components.form.sectionTitle}>Offers unavailable</div>
          <p style={components.form.helperText}>{error}</p>
          <button
            type="button"
            style={{
              marginTop: "12px",
              ...components.buttons.base,
              ...components.buttons.secondary,
              width: "fit-content",
            }}
onClick={() => { void loadOffers(); }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (<><OffersView offers={offers} onAcceptOffer={handleAcceptOffer} onRequestChanges={() => setActionError("Request changes submitted. A staff member will follow up in chat.")} />{actionError ? <div style={{ ...components.form.errorText, marginTop: "12px", textAlign: "center" }}>{actionError}</div> : null}</>);
}
