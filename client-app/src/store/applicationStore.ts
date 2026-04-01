import { create } from "zustand";

type State = {
  data: Record<string, any>;
  setData: (d: Record<string, any>) => void;
  reset: () => void;
};

export const useApplicationStore = create<State>((set) => ({
  data: {},
  setData: (d) => set((s) => ({ data: { ...s.data, ...d } })),
  reset: () => set({ data: {} }),
}));
