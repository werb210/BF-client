const KEY = "bf_applicationId";

export function setApplicationId(id: string): void {
  localStorage.setItem(KEY, id);
}

export function getApplicationId(): string | null {
  return localStorage.getItem(KEY);
}
