import { useState } from "react";
import { createApplication } from "../../services/applicationService";
import { setApplicationId } from "../../utils/applicationSession";

export default function ApplicationStep1() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async () => {
    setErrorMessage("");
    const response = await createApplication({
      companyName,
      contactName,
      email,
    });
    const payload = (response ?? {}) as { id?: string; applicationId?: string };
    const applicationId = payload.id || payload.applicationId || "";
    if (applicationId) {
      setApplicationId(applicationId);
      window.location.href = "/apply/start/step-2";
      return;
    }

    setErrorMessage("Application started but did not return an application ID.");
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>Business Information</h1>

      <input
        placeholder="Company Name"
        value={companyName}
        onChange={(event) => setCompanyName(event.target.value)}
      />

      <input
        placeholder="Contact Name"
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button onClick={() => void submit()} type="button">
        Start Application
      </button>
    </div>
  );
}
