import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { components, layout, scrollToFirstError, tokens } from "@/styles";
import { apiRequest } from "../../api/client";

export default function ApplyStep2() {
  const navigate = useNavigate();
  const applicationToken = localStorage.getItem("applicationToken");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [useOfFunds, setUseOfFunds] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      scrollToFirstError();
    }
  }, [error]);

  async function submit() {
    if (!applicationToken) {
      setError("We couldn't find your application. Please start again.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiRequest(`/api/applications/${applicationToken}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            financialProfile: {
              requestedAmount: Number(requestedAmount),
              useOfFunds,
              annualRevenue: Number(annualRevenue),
            },
          }),
        }
      );

      navigate("/apply/step-3");
    } catch {
      setError("We couldn't save your details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={layout.page}>
      <div style={layout.centerColumn}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
            <div style={components.form.eyebrow}>Step 2 of 4</div>
            <h2 style={components.form.sectionTitle}>Funding details</h2>
            <p style={components.form.subtitle}>
              Share the funding amount and how you'll use it.
            </p>

            <label style={components.form.label} htmlFor="requestedAmount">
              Requested amount (CAD)
            </label>
            <Input
              id="requestedAmount"
              type="number"
              min="0"
              placeholder="50000"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
            />

            <label style={components.form.label} htmlFor="useOfFunds">
              Use of funds
            </label>
            <textarea
              id="useOfFunds"
              placeholder="Payroll, inventory, equipment"
              value={useOfFunds}
              onChange={(e) => setUseOfFunds(e.target.value)}
              style={{
                ...components.inputs.base,
                height: "auto",
                minHeight: "90px",
                paddingTop: tokens.spacing.sm,
                paddingBottom: tokens.spacing.sm,
              }}
            />

            <label style={components.form.label} htmlFor="annualRevenue">
              Annual revenue (CAD)
            </label>
            <Input
              id="annualRevenue"
              type="number"
              min="0"
              placeholder="250000"
              value={annualRevenue}
              onChange={(e) => setAnnualRevenue(e.target.value)}
            />

            {error && (
              <div style={components.form.errorText} data-error={true}>
                {error}
              </div>
            )}

            <Button
              disabled={!requestedAmount || !useOfFunds || !annualRevenue || isSubmitting}
              onClick={submit}
              loading={isSubmitting}
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
