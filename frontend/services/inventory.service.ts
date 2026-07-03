import { api } from "@/lib/api-client";
import type { InventoryItem, InventoryTransaction } from "@/lib/types";

export const inventoryService = {
  async getInventory(): Promise<{ items: InventoryItem[] }> {
    return api.get<{ items: InventoryItem[] }>("/inventory");
  },

  async getTransactions(itemId?: string): Promise<{ transactions: InventoryTransaction[] }> {
    return api.get<{ transactions: InventoryTransaction[] }>("/inventory/transactions", {
      params: itemId ? { item_id: itemId } : undefined,
    });
  },

  async createItem(payload: {
    name: string;
    unit?: "kg" | "g" | "liter" | "unit";
    current_stock?: number;
    reorder_level?: number;
    cost_per_unit?: number;
  }): Promise<{ item: InventoryItem }> {
    return api.post<{ item: InventoryItem }>("/inventory/items", payload);
  },

  async stockIn(payload: { item_id: string; quantity: number; cost_per_unit?: number }) {
    return api.post("/inventory/stock-in", payload);
  },

  async logWaste(payload: { item_id: string; quantity: number; reason?: string }) {
    return api.post("/inventory/waste", payload);
  },

  async adjustStock(payload: { item_id: string; quantity: number }) {
    return api.post("/inventory/adjustment", payload);
  },
};
