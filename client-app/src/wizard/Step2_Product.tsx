// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getClientLenderProducts,
  type ClientLenderProduct,
  type LenderProductRequirement,
} from "../api/lenders";
import { useApplicationStore } from "../state/useApplicationStore";
import { StepHeader } from "../components/StepHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { WizardLayout } from "../components/WizardLayout";
import {
  createLinkedApplication,
  LinkedApplicationStore,
} from "../applications/linkedApplications";
import { ClientProfileStore } from "../state/clientProfiles";
import {
  filterActiveProducts,
  buildCategorySummaries,
  groupProductsByLender,
  getMatchingProducts,
  isAmountWithinRange,
  matchesCountry,
  parseCurrencyAmount,
  type ActiveProduct,
} from "./productSelection";
import { formatCurrencyValue, getCountryCode } from "../utils/location";
import {
  filterRequirementsByAmount,
  formatDocumentLabel,
  normalizeRequirementList,
} from "./requirements";
import { getEligibilityResult } from "../lender/eligibility";
import type { NormalizedLenderProduct } from "../lender/eligibility";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import CapitalReadinessModal from "../components/CapitalReadinessModal";
import { trackEvent } from "../utils/analytics";
import { components, layout, tokens } from "@/styles";
import { resolveStepGuard } from "./stepGuard";
import { track } from "../utils/track";
import { persistApplicationStep } from "./saveStepProgress";

function formatAmount(amount: number | null | undefined, countryCode: string) {
  if (typeof amount !== "number") return "N/A";
  return formatCurrencyValue(String(amount), countryCode) || amount.toString();
}

export function Step2_Product() {
  const { app, update } = useApplicationStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ActiveProduct[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [closingError, setClosingError] = useState<string | null>(null);
  const [closingBusy, setClosingBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const countryCode = useMemo(
    () => getCountryCode(app.kyc.businessLocation),
    [app.kyc.businessLocation]
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === app.selectedProductId),
    [app.selectedProductId, products]
  );
  const selectedCategory =
    app.productCategory ||
    app.selectedProductType ||
    app.selectedProduct?.product_type ||
    app.selectedProduct?.name ||
    "";
  const amountValue = useMemo(
    () => parseCurrencyAmount(app.kyc.fundingAmount),
    [app.kyc.fundingAmount]
  );
  const amountValid = selectedProduct
    ? isAmountWithinRange(
        amountValue,
        selectedProduct.amount_min,
        selectedProduct.amount_max
      )
    : false;
  const amountError =
    selectedProduct && !amountValid
      ? `Requested amount must be between ${formatAmount(
          selectedProduct.amount_min,
          countryCode
        )} and ${formatAmount(selectedProduct.amount_max, countryCode)}.`
      : null;
  const amountDisplay = app.kyc.fundingAmount
    ? formatCurrencyValue(String(amountValue), countryCode) ||
      app.kyc.fundingAmount
    : "Not provided";
  const selectedRequirements = useMemo(() => {
    if (!app.selectedProductId) return [];
    const cached = app.productRequirements?.[app.selectedProductId] || [];
    return filterRequirementsByAmount(cached, app.kyc.fundingAmount);
  }, [app.kyc.fundingAmount, app.productRequirements, app.selectedProductId]);
  const requiredDocuments = useMemo(
    () => selectedRequirements.filter((entry) => entry.required),
    [selectedRequirements]
  );
  const isEquipmentIntent = useMemo(() => {
    const intent = (app.kyc.lookingFor || "").toLowerCase();
    return (
      intent.includes("equipment") ||
      (selectedProduct?.product_type ?? "").toLowerCase().includes("equipment")
    );
  }, [app.kyc.lookingFor, selectedProduct?.product_type]);

  const normalizedProducts = useMemo(() => {
    return products.map((product) => ({
      productId: product.id,
      category: product.product_type ?? product.name,
      minAmount: product.amount_min ?? 0,
      maxAmount: product.amount_max ?? 0,
      supportedCountries: product.country ? [product.country] : [],
      requiredDocs: normalizeRequirementList(
        product.required_documents ?? []
      ).map((entry) => entry.document_type),
    })) as NormalizedLenderProduct[];
  }, [products]);

  const eligibility = useMemo(() => {
    return getEligibilityResult(
      normalizedProducts,
      {
        fundingIntent: app.kyc.lookingFor,
        amountRequested: app.kyc.fundingAmount,
        businessLocation: app.kyc.businessLocation,
        accountsReceivableBalance: app.kyc.accountsReceivable,
      },
      app.matchPercentages
    );
  }, [
    app.kyc.accountsReceivable,
    app.kyc.businessLocation,
    app.kyc.fundingAmount,
    app.kyc.lookingFor,
    app.matchPercentages,
    normalizedProducts,
  ]);

  const categorySummaries = useMemo(() => {
    return buildCategorySummaries(products, countryCode, amountValue);
  }, [amountValue, countryCode, products]);
  const visibleCategorySummaries = useMemo(() => {
    if (!amountValue) return categorySummaries;
    const filtered = categorySummaries.filter((summary) => {
      const amountTooLow =
        summary.matchingCount === 0 && amountValue < summary.minAmount;
      return !amountTooLow;
    });
    return filtered.length ? filtered : categorySummaries;
  }, [amountValue, categorySummaries]);

  useEffect(() => {
    if (app.currentStep !== 2) {
      update({ currentStep: 2 });
    }
    trackEvent("client_step_progressed", { step: 2 });
  }, [app.currentStep, update]);

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 2 });
  }, []);

  useEffect(() => {
    const guardedStep = resolveStepGuard(app.currentStep, 2);
    if (guardedStep !== 2) {
      navigate(`/apply/step-${guardedStep}`, { replace: true });
    }
  }, [app.currentStep, navigate]);

  useEffect(() => {
    if (!normalizedProducts.length) return;
    update({
      eligibleProducts: eligibility.eligibleProducts,
      eligibleCategories: eligibility.categories,
      eligibilityReasons: eligibility.reasons,
    });
  }, [eligibility, normalizedProducts.length, update]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 1;

    async function loadProducts() {
      if (attempts >= MAX_ATTEMPTS) return;
      attempts += 1;
      setIsLoading(true);
      setLoadError(null);

      try {
        const rows = await getClientLenderProducts();
        const activeProducts = filterActiveProducts(
          rows as ActiveProduct[]
        ).sort((a, b) => a.name.localeCompare(b.name));
        const requirementsMap = Object.fromEntries(
          activeProducts.map((product) => [
            product.id,
            normalizeRequirementList(product.required_documents ?? []),
          ])
        );

        if (!cancelled) {
          setProducts(activeProducts);
          if (Object.keys(requirementsMap).length > 0) {
            update({
              productRequirements: {
                ...(app.productRequirements || {}),
                ...requirementsMap,
              },
            });
          }
          if (
            app.selectedProductId &&
            !activeProducts.some(
              (product) => product.id === app.selectedProductId
            )
          ) {
            update({
              selectedProduct: undefined,
              selectedProductId: undefined,
              selectedProductType: undefined,
              documents: {},
              documentsDeferred: false,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError(
            "Unable to load product options. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  function select(product: ClientLenderProduct) {
    const category = product.product_type ?? product.name;
    trackEvent("client_product_selected", { productId: product.id, category });
    update({
      productCategory: category,
      selectedProduct: {
        id: product.id,
        name: product.name,
        product_type: category,
        lender_id: product.lender_id,
      },
      selectedProductId: product.id,
      selectedProductType: category,
      requires_closing_cost_funding: undefined,
      documents: {},
      documentsDeferred: false,
    });
  }

  function goBack() {
    navigate("/apply/step-1");
  }

  function goNext() {
    if (!selectedProduct || loadError) {
      return;
    }
    if (
      isEquipmentIntent &&
      app.requires_closing_cost_funding === undefined &&
      app.applicationToken &&
      !LinkedApplicationStore.has(app.applicationToken)
    ) {
      setClosingError(null);
      setShowClosingModal(true);
      return;
    }
    if (
      isEquipmentIntent &&
      app.requires_closing_cost_funding &&
      app.applicationToken &&
      !LinkedApplicationStore.has(app.applicationToken)
    ) {
      setClosingError(null);
      setShowClosingModal(true);
      return;
    }
    void persistApplicationStep(app, 2, {
      selectedProduct: app.selectedProduct || null,
      selectedProductId: app.selectedProductId || null,
      selectedProductType: app.selectedProductType || null,
      productCategory: app.productCategory || null,
      requires_closing_cost_funding: app.requires_closing_cost_funding,
    })
      .then(() => {
        setSaveError(null);
        track("step_completed", { step: 2 });
        navigate("/apply/step-3");
      })
      .catch(() => {
        setSaveError("We couldn't save this step. Please try again.");
      });
  }

  async function confirmClosingCosts() {
    if (!app.applicationToken) {
      setClosingError("Missing application token. Please restart your application.");
      return;
    }
    update({ requires_closing_cost_funding: true });
    setClosingBusy(true);
    setClosingError(null);
    try {
      const token = await createLinkedApplication(
        app.applicationToken,
        app.kyc,
        "closing_costs"
      );
      update({
        linkedApplicationTokens: [
          token,
          ...(app.linkedApplicationTokens || []),
        ],
      });
      if (app.kyc?.phone) {
        ClientProfileStore.upsertProfile(app.kyc.phone, token);
      }
      await persistApplicationStep(app, 2, {
        selectedProduct: app.selectedProduct || null,
        selectedProductId: app.selectedProductId || null,
        selectedProductType: app.selectedProductType || null,
        productCategory: app.productCategory || null,
        requires_closing_cost_funding: true,
      });
      setShowClosingModal(false);
      setSaveError(null);
      track("step_completed", { step: 2 });
      navigate("/apply/step-3");
    } catch {
      setClosingError("Unable to create the linked application. Try again.");
    } finally {
      setClosingBusy(false);
    }
  }

  function declineClosingCosts() {
    update({ requires_closing_cost_funding: false });
    void persistApplicationStep(app, 2, {
      selectedProduct: app.selectedProduct || null,
      selectedProductId: app.selectedProductId || null,
      selectedProductType: app.selectedProductType || null,
      productCategory: app.productCategory || null,
      requires_closing_cost_funding: false,
    })
      .then(() => {
        setSaveError(null);
        setShowClosingModal(false);
        track("step_completed", { step: 2 });
        navigate("/apply/step-3");
      })
      .catch(() => {
        setSaveError("We couldn't save this step. Please try again.");
      });
  }

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesCountry(product.country, countryCode)),
    [countryCode, products]
  );
  const matchingProducts = useMemo(() => {
    return getMatchingProducts(
      products,
      countryCode,
      amountValue,
      selectedCategory || null
    );
  }, [amountValue, countryCode, products, selectedCategory]);
  const matchingLenderCount = useMemo(() => {
    return new Set(matchingProducts.map((product) => product.lender_id)).size;
  }, [matchingProducts]);
  const selectedSummary = useMemo(() => {
    if (!selectedCategory) return null;
    return (
      categorySummaries.find((summary) => summary.category === selectedCategory) ||
      null
    );
  }, [categorySummaries, selectedCategory]);
  const alternateCategory = useMemo(() => {
    if (!selectedSummary || amountValue <= 0) return null;
    if (selectedSummary.matchingCount > 0) return null;
    if (amountValue >= selectedSummary.minAmount) return null;
    const eligible = categorySummaries.filter((summary) => summary.matchingCount > 0);
    if (eligible.length > 0) {
      return eligible.sort((a, b) => a.minAmount - b.minAmount)[0];
    }
    return categorySummaries.sort((a, b) => a.minAmount - b.minAmount)[0] || null;
  }, [amountValue, categorySummaries, selectedSummary]);
  const groupedProducts = useMemo(
    () => groupProductsByLender(filteredProducts),
    [filteredProducts]
  );
  const noProducts = !isLoading && filteredProducts.length === 0 && !loadError;

  useEffect(() => {
    if (
      app.selectedProductId &&
      !filteredProducts.some((product) => product.id === app.selectedProductId)
    ) {
      update({
        selectedProduct: undefined,
        selectedProductId: undefined,
        selectedProductType: undefined,
        documents: {},
        documentsDeferred: false,
      });
    }
  }, [app.selectedProductId, filteredProducts, update]);

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: "0 0 48px" }}>
      <div style={{ height: 4, background: "#e5e7eb", width: "100%" }}>
        <div style={{ height: 4, background: "#2563eb", width: `${(2 / 6) * 100}%`, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 0" }}>
        <h1 style={{ color: "#2563eb", fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Step 2: Choose Product Category</h1>
        <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 32, fontSize: 15 }}>Select the best-fit financing product for your business.</p>
    <WizardLayout>
      <StepHeader step={2} title="Choose Product Category" />
      {saveError && (
        <Card variant="muted" data-error={true}>
          <div style={components.form.errorText}>{saveError}</div>
        </Card>
      )}
      <div style={{ marginBottom: tokens.spacing.sm }}>
        <Button type="button" variant="secondary" onClick={() => setShowReadinessModal(true)}>
          Check capital readiness
        </Button>
      </div>

      <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.sm }}>
            <Spinner />
            <span style={components.form.helperText}>Loading product options…</span>
          </div>
        )}
        {visibleCategorySummaries.length > 0 && (
          <div
            style={{
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radii.lg,
              padding: tokens.spacing.md,
              background: "rgba(11, 42, 74, 0.06)",
            }}
          >
            <div style={components.form.eyebrow}>Product categories</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: tokens.spacing.sm,
              marginTop: tokens.spacing.sm,
            }}
          >
              {visibleCategorySummaries.map((summary) => {
                const amountTooLow =
                  amountValue > 0 && summary.matchingCount === 0 &&
                  amountValue < summary.minAmount;
                const amountTooHigh =
                  amountValue > 0 && summary.matchingCount === 0 &&
                  amountValue > summary.maxAmount;
                return (
                  <div
                    key={summary.category}
                    style={{
                      borderRadius: tokens.radii.md,
                      border: `1px solid ${tokens.colors.border}`,
                      background: tokens.colors.surface,
                      padding: tokens.spacing.sm,
                      display: "flex",
                      flexDirection: "column",
                      gap: tokens.spacing.xs,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 600, color: tokens.colors.primary }}>
                        {summary.category}
                      </div>
                      <span style={components.form.helperText}>
                        {summary.matchingCount} match{summary.matchingCount === 1 ? "" : "es"}
                      </span>
                    </div>
                    <div style={components.form.helperText}>
                      Range: {formatAmount(summary.minAmount, countryCode)} to{" "}
                      {formatAmount(summary.maxAmount, countryCode)} · {summary.totalCount} total
                    </div>
                    {(amountTooLow || amountTooHigh) && (
                      <div style={{ ...components.form.helperText, color: tokens.colors.warning }}>
                        {amountTooLow && "Requested amount is below the minimum for this category."}
                        {amountTooHigh && "Requested amount is above the maximum for this category."}
                        <div>
                          Try between {formatAmount(summary.minAmount, countryCode)} and{" "}
                          {formatAmount(summary.maxAmount, countryCode)}.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {loadError && (
          <Card variant="muted">
            <EmptyState>{loadError}</EmptyState>
          </Card>
        )}
        {!loadError && noProducts && (
          <Card variant="muted">
            <EmptyState>
              No products match your location. Review the category ranges above
              for alternatives.
            </EmptyState>
          </Card>
        )}
        {!loadError && !noProducts && (
          <div style={layout.stack}>
            <div
              style={{
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: tokens.radii.md,
                padding: tokens.spacing.md,
                background: tokens.colors.background,
                fontSize: tokens.typography.body.fontSize,
                color: tokens.colors.textSecondary,
              }}
            >
              Requested amount:{" "}
              <span style={{ color: tokens.colors.textPrimary, fontWeight: 600 }}>
                {amountDisplay}
              </span>
              {selectedCategory && (
                <div style={{ marginTop: tokens.spacing.xs }}>
                  <span style={{ fontWeight: 600 }}>Matching products:</span>{" "}
                  {matchingProducts.length} across {matchingLenderCount} lender
                  {matchingLenderCount === 1 ? "" : "s"} for {selectedCategory}.
                </div>
              )}
              {amountError && (
                <div style={components.form.errorText}>{amountError}</div>
              )}
              {alternateCategory && (
                <div style={{ ...components.form.helperText, color: tokens.colors.warning }}>
                  Requested amount is below the minimum for {selectedCategory}.{" "}
                  Consider {alternateCategory.category} starting at{" "}
                  {formatAmount(alternateCategory.minAmount, countryCode)}.
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
              {groupedProducts.map((group) => (
                <div key={group.lenderId} style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
                  <div
                    style={{
                      fontSize: "13px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: tokens.colors.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {group.lenderName}
                  </div>
                  <div style={{ display: "grid", gap: tokens.spacing.md }}>
                    {group.products.map((product) => {
                      const isSelected = product.id === app.selectedProductId;
                      const previewRequirements =
                        app.productRequirements?.[product.id] || [];
                      const previewRequired = filterRequirementsByAmount(
                        previewRequirements as LenderProductRequirement[],
                        app.kyc.fundingAmount
                      ).filter((entry) => entry.required);
                      const showPreview = isSelected && previewRequired.length > 0;
                      return (
                        <Card
                          key={product.id}
                          onClick={() => select(product)}
                          style={{
                            borderColor: isSelected
                              ? tokens.colors.success
                              : tokens.colors.border,
                            boxShadow: isSelected
                              ? "0 0 0 2px rgba(22, 163, 74, 0.24)"
                              : tokens.shadows.card,
                            cursor: "pointer",
                            background: isSelected
                              ? "rgba(22, 163, 74, 0.08)"
                              : tokens.colors.surface,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: tokens.spacing.md,
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.xs }}>
                              <div
                                style={{
                                  fontSize: tokens.typography.h2.fontSize,
                                  fontWeight: tokens.typography.h2.fontWeight,
                                  color: tokens.colors.textPrimary,
                                }}
                              >
                                {product.name}
                              </div>
                              {product.product_type && (
                                <div style={components.form.helperText}>
                                  Type: {product.product_type}
                                </div>
                              )}
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: tokens.spacing.sm,
                                  fontSize: tokens.typography.helper.fontSize,
                                  color: tokens.colors.textSecondary,
                                }}
                              >
                                <span>Country: {product.country}</span>
                                <span>
                                  Min: {formatAmount(product.amount_min, countryCode)}
                                </span>
                                <span>
                                  Max: {formatAmount(product.amount_max, countryCode)}
                                </span>
                                {product.term && <span>Term: {product.term}</span>}
                                {product.rate && <span>Rate: {product.rate}</span>}
                              </div>
                              {isSelected && (
                                <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.xs }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.xs }}>
                                    <span style={{ fontWeight: 600 }}>
                                      Documents Required
                                    </span>
                                    <span
                                      style={{
                                        padding: "2px 8px",
                                        borderRadius: tokens.radii.pill,
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        background: "rgba(11, 42, 74, 0.12)",
                                        color: tokens.colors.primary,
                                        border: "1px solid rgba(11, 42, 74, 0.3)",
                                      }}
                                    >
                                      {requiredDocuments.length}
                                    </span>
                                  </div>
                                  {showPreview && (
                                    <ul style={{ margin: 0, paddingLeft: "20px" }}>
                                      {previewRequired.map((entry) => (
                                        <li key={entry.id}>
                                          {formatDocumentLabel(entry.document_type)}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {isSelected && previewRequired.length === 0 && (
                                    <div style={components.form.helperText}>
                                      No required documents listed for this product.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: tokens.spacing.xs,
                              }}
                            >
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => select(product)}
                                aria-label={`Select ${product.name}`}
                              />
                              {isSelected && (
                                <span
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: tokens.radii.pill,
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    background: "rgba(22, 163, 74, 0.12)",
                                    color: "rgb(21 128 61)",
                                    border: "1px solid rgba(22, 163, 74, 0.35)",
                                  }}
                                >
                                  Selected
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div style={{ ...layout.stickyCta, marginTop: tokens.spacing.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
          <Button
            variant="secondary"
            style={{ width: "100%", maxWidth: "160px" }}
            onClick={goBack}
          >
            Back
          </Button>
          <Button
            style={{ width: "100%", maxWidth: "200px" }}
            onClick={goNext}
            disabled={
              !selectedProduct ||
              Boolean(loadError) ||
              noProducts
            }
          >
            Continue
          </Button>
        </div>
      </div>

      {showClosingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: tokens.spacing.md,
            zIndex: 50,
          }}
        >
          <div
            style={{
              ...components.card.base,
              maxWidth: "520px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: tokens.spacing.sm,
            }}
          >
            <h2 style={components.form.sectionTitle}>Include closing costs?</h2>
            <p style={components.form.subtitle}>
              Choose yes to add a linked application for closing costs or
              equipment deposits. Both applications stay connected in your
              client portal.
            </p>
            {closingError && (
              <div style={components.form.errorText}>{closingError}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: tokens.spacing.sm }}>
              <Button
                variant="secondary"
                style={{ width: "100%" }}
                onClick={declineClosingCosts}
                disabled={closingBusy}
              >
                No, continue
              </Button>
              <Button
                style={{ width: "100%" }}
                onClick={confirmClosingCosts}
                disabled={closingBusy}
                loading={closingBusy}
              >
                Yes, include closing costs
              </Button>
            </div>
          </div>
        </div>
      )}
      <CapitalReadinessModal
        isOpen={showReadinessModal}
        onClose={() => setShowReadinessModal(false)}
        onContinueApplication={(score) => {
          update({ readinessScore: score });
          setShowReadinessModal(false);
        }}
      />
    </WizardLayout>
    </div>
    </div>
  );
}

export default Step2_Product;
