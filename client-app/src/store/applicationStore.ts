// @ts-nocheck
import { create } from "zustand";

const APPLICATION_DATA_KEY = "application_data";

type ApplicationStore = {
  data: Record<string, unknown>;
  setData: (updates: Record<string, unknown>) => void;
  clearData: () => void;
};

function loadInitialData(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(APPLICATION_DATA_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const useApplicationStore = create<ApplicationStore>((set) => ({
  data: loadInitialData(),
  setData: (updates) =>
    set((state) => {
      const data = { ...state.data, ...updates };
      localStorage.setItem(APPLICATION_DATA_KEY, JSON.stringify(data));
      return { data };
    }),
  clearData: () =>
    set(() => {
      localStorage.removeItem(APPLICATION_DATA_KEY);
      return { data: {} };
    }),
}));
