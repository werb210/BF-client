import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { components, layout, scrollToFirstError, tokens } from "@/styles";
import { apiRequest } from "../../api/client";

export default function ApplyStep3() {
  const navigate = useNavigate();
  const applicationToken = localStorage.getItem("applicationToken");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      await apiRequest(`/applications/${applicationToken}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicant: {
              firstName,
              lastName,
              email,
              phone,
            },
          }),
        }
      );

      navigate("/apply/step-4");
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
            <div style={components.form.eyebrow}>Step 3 of 4</div>
            <h2 style={components.form.sectionTitle}>Owner details</h2>
            <p style={components.form.subtitle}>
              Tell us about the primary applicant.
            </p>

            <label style={components.form.label} htmlFor="firstName">
              First name
            </label>
            <Input
              id="firstName"
              placeholder="Jordan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <label style={components.form.label} htmlFor="lastName">
              Last name
            </label>
            <Input
              id="lastName"
              placeholder="Lee"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            <label style={components.form.label} htmlFor="email">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="jordan@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label style={components.form.label} htmlFor="phone">
              Phone number
            </label>
            <PhoneInput
              id="phone"
              placeholder="(555) 555-5555"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {error && (
              <div style={components.form.errorText} data-error={true}>
                {error}
              </div>
            )}

            <Button
              disabled={!firstName || !lastName || !email || !phone || isSubmitting}
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
