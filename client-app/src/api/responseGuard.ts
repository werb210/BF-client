export type ApiLikeResponse<T = unknown> = {
  status?: number;
  data?: T;
};

export function assertOk<T>(response: ApiLikeResponse<T>): ApiLikeResponse<T> {
  if (!response || typeof response.status !== "number" || response.status >= 400) {
    throw new Error("API contract violation");
  }

  return response;
}
