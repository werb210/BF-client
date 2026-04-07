import { create } from "zustand";

type State = {
  data: Record<string, unknown>;
  setData: (d: Record<string, unknown>) => void;
  reset: () => void;
};

type StoreSet = (
  partial: State | Partial<State> | ((state: State) => State | Partial<State>),
  replace?: boolean,
) => void;

const createApplicationStore = (set: StoreSet): State => ({
  data: {},
  setData: (d: Record<string, unknown>) => set((s: State) => ({ data: { ...s.data, ...d } })),
  reset: () => set({ data: {} }),
});

export const useApplicationStore = create<State>(createApplicationStore);
