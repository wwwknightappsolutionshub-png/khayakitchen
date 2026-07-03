import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

interface CartState {
  items: CartItem[];
  activeOrderId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (mealId: string, optionsKey: string) => void;
  updateQuantity: (mealId: string, optionsKey: string, quantity: number) => void;
  clearCart: () => void;
  setActiveOrderId: (orderId: string | null) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export function getOptionsKey(options: CartItem["selectedOptions"]): string {
  return options
    .map((o) => o.optionId)
    .sort()
    .join("-");
}

export function getLinePrice(item: CartItem): number {
  const optionsTotal = item.selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0);
  return (item.basePrice + optionsTotal) * item.quantity;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      activeOrderId: null,
      addItem: (item) => {
        const optionsKey = getOptionsKey(item.selectedOptions);
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.mealId === item.mealId && getOptionsKey(i.selectedOptions) === optionsKey,
          );
          if (existingIndex >= 0) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + item.quantity,
            };
            return { items: updated };
          }
          return { items: [...state.items, item] };
        });
      },
      removeItem: (mealId, optionsKey) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.mealId === mealId && getOptionsKey(i.selectedOptions) === optionsKey),
          ),
        }));
      },
      updateQuantity: (mealId, optionsKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(mealId, optionsKey);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.mealId === mealId && getOptionsKey(i.selectedOptions) === optionsKey
              ? { ...i, quantity }
              : i,
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      setActiveOrderId: (orderId) => set({ activeOrderId: orderId }),
      getTotal: () => get().items.reduce((sum, item) => sum + getLinePrice(item), 0),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "khayaos-cart" },
  ),
);
