import { useEffect } from "react";
import { trackConversion } from "@/utils/analytics";

export default function ConfirmationPage() {
  // BF_CLIENT_GA4_SUBMIT_CONVERSION_v1 — fire the application-submit conversion.
  useEffect(() => {
    trackConversion("application_submit");
  }, []);
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-semibold">Application Submitted</h1>
      <p>Your application has been successfully submitted.</p>
    </div>
  )
}
