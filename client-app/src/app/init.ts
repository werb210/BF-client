export function enforceLeadHandoff() {
  const params = new URLSearchParams(window.location.search)
  const leadId = params.get("leadId")

  if (!leadId) {
    throw new Error("[BLOCKED] NO LEAD ID")
  }

  return leadId
}
