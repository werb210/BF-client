import { useState } from "react";
import { submitApplication } from "./submitApplication";
import { useApplicationForm } from "./useApplicationForm";
import { validateApplication } from "./validate";

export function ApplicationForm() {
  const { form, updateField } = useApplicationForm();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    const errors = validateApplication(form);

    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    try {
      await submitApplication(form);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <input
        value={form.firstName || ""}
        onChange={(e) => updateField("firstName", e.target.value)}
        placeholder="First name"
      />
      {errors.firstName ? <p>{errors.firstName}</p> : null}

      <input
        value={form.lastName || ""}
        onChange={(e) => updateField("lastName", e.target.value)}
        placeholder="Last name"
      />
      {errors.lastName ? <p>{errors.lastName}</p> : null}

      <input
        value={form.email || ""}
        onChange={(e) => updateField("email", e.target.value)}
        placeholder="Email"
      />
      {errors.email ? <p>{errors.email}</p> : null}

      <button onClick={() => void handleSubmit()}>Submit</button>

      {error ? <p>{error}</p> : null}
      {success ? <p>Success</p> : null}
    </div>
  );
}
