export function handleApiError(err: any) {
  if (err?.response?.status === 401) {
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("boreal_client_token");
    window.location.reload();
  }

  console.error("API error:", err);
}
