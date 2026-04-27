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
import { trackEvent } from "../utils/analytics";
import { components, layout, tokens } from "@/styles";
import { resolveStepGuard } from "./stepGuard";
import { track } from "../utils/track";
import { persistApplicationStep } from "./saveStepProgress";
import { dedupeProductsByBucket, type BucketId } from "./categoryAliases";

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
  const [closingError, setClosingError] = useState<string | null>(null);
  const [closingBusy, setClosingBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<BucketId | null>(
    app.productCategory ? (app.productCategory as BucketId) : null
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    app.selectedProductId ? [app.selectedProductId] : []
  );
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
      // BF_CREDIT_BAND_v36
      minCreditScore:
        product.min_credit_score != null
          ? Number(product.min_credit_score)
          : product.minCreditScore != null
            ? Number(product.minCreditScore)
            : null,
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
        // BF_CREDIT_BAND_v36 — pass through applicant's credit band.
        creditScoreRange: (app.applicant as any)?.creditScoreRange ?? null,
      },
      app.matchPercentages
    );
  }, [
    app.applicant,
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- BF_STEP_RESET_NORACE_v37 (Block 37) — running on every currentStep change caused unmounting step to reset back, fighting next step’s mount effect

  useEffect(() => {
    trackEvent("client_step_viewed", { step: 2 });
  }, []);

  // [removed] resolveStepGuard effect — caused step transition races

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

  function selectCategory(category: string, productIds?: string[]) {
    const matches = filteredProducts.filter(
      (p) => (p.product_type ?? p.name) === category
    );
    const match = matches[0];
    const ids = productIds && productIds.length ? productIds : matches.map((product) => product.id);
    update({
      productCategory: category,
      selectedProductType: category,
      selectedProduct: match
        ? { id: match.id, name: match.name, product_type: category, lender_id: match.lender_id }
        : undefined,
      selectedProductId: match?.id,
      requires_closing_cost_funding: undefined,
      documents: {},
      documentsDeferred: false,
    });
    setSelectedBucket(category as BucketId);
    setSelectedProductIds(ids);
    trackEvent("client_category_selected", { category });
  }

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
    if (!selectedCategory || loadError) {
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
    // Fire-and-forget autosave; navigation must never block on the network.
    // Mirrors Step 1's startApplication() pattern.
    persistApplicationStep(app, 2, {
      selectedProduct: app.selectedProduct || null,
      selectedProductId: app.selectedProductId || null,
      selectedProductType: app.selectedProductType || null,
      productCategory: app.productCategory || null,
      requires_closing_cost_funding: app.requires_closing_cost_funding,
    }).catch(() => {});
    setSaveError(null);
    track("step_completed", { step: 2 });
    console.log("[wizard] Step2.goNext: about to advance", { selectedCategory, applicationToken: app.applicationToken, currentStep: app.currentStep });
    update({ currentStep: 3 });
    console.log("[wizard] Step2.goNext: update({currentStep:3}) returned, calling navigate now");
    navigate("/apply/step-3", {
      state: {
        bucket: selectedBucket || selectedCategory,
        productIds: selectedProductIds,
      },
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
        "closing_costs",
        app.applicationId
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
      navigate("/apply/step-3", {
        state: {
          bucket: selectedBucket || selectedCategory,
          productIds: selectedProductIds,
        },
      });
    } catch (error: any) {
      setClosingError(
        error?.message || "Could not create the linked application. Try again."
      );
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
        navigate("/apply/step-3", {
          state: {
            bucket: selectedBucket || selectedCategory,
            productIds: selectedProductIds,
          },
        });
      })
      .catch(() => {
        setSaveError("We couldn't save this step. Please try again.");
      });
  }

  const filteredProducts = useMemo(
    () => products.filter((product) => matchesCountry(product.country, countryCode)),
    [countryCode, products]
  );
  const categoryBuckets = useMemo(
    () =>
      dedupeProductsByBucket(
        filteredProducts.map((product) => ({
          ...product,
          category: product.product_type ?? product.name,
        }))
      ),
    [filteredProducts]
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

  useEffect(() => {
    if (!selectedCategory) return;
    setSelectedBucket(selectedCategory as BucketId);
  }, [selectedCategory]);

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
      <Card style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.lg }}>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.sm }}>
            <Spinner />
            <span style={components.form.helperText}>Loading product options…</span>
          </div>
        )}
        {loadError && (
          <div style={components.form.errorText}>{loadError}</div>
        )}
        {!isLoading && !loadError && visibleCategorySummaries.length === 0 && (
          <EmptyState>No financing products are available for your location.</EmptyState>
        )}
        {!isLoading && !loadError && categoryBuckets.map((bucket) => {
          const category = bucket.bucket;
          const isSelected = selectedBucket === category || selectedCategory === category;
          const matchPct = app.matchPercentages?.[category] ?? null;
          return (
            <div
              key={bucket.bucket}
              onClick={() => selectCategory(category, bucket.products.map((product) => product.id))}
              style={{
                border: `1px solid ${isSelected ? "#2563eb" : "#e5e7eb"}`,
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: isSelected ? "#eff6ff" : "#fff",
                cursor: "pointer",
                marginBottom: 8,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>
                  {bucket.label}
                </div>
                <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
                  {bucket.products.length} product{bucket.products.length !== 1 ? "s" : ""} available
                  {matchPct !== null ? ` (Match score ${matchPct}%)` : ""}
                </div>
                {matchPct !== null && (
                  <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>
                    {matchPct}% Match
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectCategory(category, bucket.products.map((product) => product.id));
                }}
                style={{
                  padding: "6px 18px",
                  borderRadius: 6,
                  border: `1px solid ${isSelected ? "#2563eb" : "#d1d5db"}`,
                  background: isSelected ? "#2563eb" : "#fff",
                  color: isSelected ? "#fff" : "#374151",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isSelected ? "Selected" : "Select"}
              </button>
            </div>
          );
        })}
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
              !selectedBucket ||
              Boolean(loadError) ||
              (!isLoading && categoryBuckets.length === 0)
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
    </WizardLayout>
    </div>
    </div>
  );
}

export default Step2_Product;
