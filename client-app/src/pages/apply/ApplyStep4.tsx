import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { components, layout, tokens } from "@/styles";
import { createLead } from "@/services/lead";
import { apiRequest } from "@/api/client";
import { getMe } from "@/lib/auth";
import { API_ENDPOINTS_CONTRACT } from "@/contracts";

type Step4Values = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ownership: string;
};

export default function ApplyStep4() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<Step4Values>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    ownership: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof Step4Values, value: string) {
    const updated = { ...formValues, [field]: value };
    setFormValues(updated);
    localStorage.setItem("step4", JSON.stringify(updated));
  }

  async function submitFinal() {
    setError(null);
    setSubmitting(true);

    try {
      const step1 = JSON.parse(localStorage.getItem("step1") || "{}");
      const step3 = JSON.parse(localStorage.getItem("step3") || "{}");
      const step4 = JSON.parse(localStorage.getItem("step4") || "{}");

      const lead = await createLead({
        companyName: step3.legalName,
        fullName: `${step4.firstName} ${step4.lastName}`,
        email: step4.email,
        phone: step4.phone,
        industry: step1.industry,
      });

      localStorage.setItem("leadId", lead.leadId);

      const me = await getMe();
      if (!me) {
        throw new Error("Please sign in before submitting your application.");
      }

      await apiRequest("/api/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: step3,
          contact: step4,
          financialProfile: step1,
          productSelection: localStorage.getItem("step2"),
        }),
      });

      navigate("/apply/success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't submit your application. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={layout.page}>
      <div style={layout.centerColumn}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
            <h2 style={components.form.sectionTitle}>Step 4: Applicant + Ownership</h2>

            <Input
              placeholder="First name"
              value={formValues.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />

            <Input
              placeholder="Last name"
              value={formValues.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />

            <Input
              type="email"
              placeholder="Email"
              value={formValues.email}
              onChange={(e) => update("email", e.target.value)}
            />

            <PhoneInput
              placeholder="Phone"
              value={formValues.phone}
              onChange={(e) => update("phone", e.target.value)}
            />

            <Input
              placeholder="Ownership %"
              value={formValues.ownership}
              onChange={(e) => update("ownership", e.target.value)}
            />

            {error && (
              <div style={components.form.errorText} data-error={true}>
                {error}
              </div>
            )}

            <Button
              onClick={submitFinal}
              loading={submitting}
              disabled={
                submitting ||
                !formValues.firstName ||
                !formValues.lastName ||
                !formValues.email ||
                !formValues.phone ||
                !formValues.ownership
              }
            >
              Submit application
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
