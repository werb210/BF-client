import applicationFixture from "@/__tests__/fixtures/application.json";
import lendersFixture from "@/__tests__/fixtures/lenders.json";
import { vi } from "vitest";

export const mockedApi = {
  get: vi.fn(async (url: string) => {
    if (url.includes("lenders")) {
      return { data: lendersFixture };
    }

    return { data: applicationFixture };
  }),
  post: vi.fn(async () => ({ data: applicationFixture })),
  patch: vi.fn(async () => ({ data: applicationFixture })),
};

export function installApiMock() {
  vi.mock("@/api/client", () => ({
    default: mockedApi,
    apiRequest: vi.fn(async () => applicationFixture),
    buildApiUrl: vi.fn((path: string) => `https://server.boreal.financial${path}`),
  }));
}
