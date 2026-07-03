import { create } from "zustand";

interface UiState {
  cartBounce: boolean;
  triggerCartBounce: () => void;
  clearCartBounce: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  cartBounce: false,
  triggerCartBounce: () => {
    set({ cartBounce: true });
    setTimeout(() => set({ cartBounce: false }), 250);
  },
  clearCartBounce: () => set({ cartBounce: false }),
}));
