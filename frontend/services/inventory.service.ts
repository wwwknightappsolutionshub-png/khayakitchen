import { api } from "@/lib/api-client";
import type { InventoryItem } from "@/lib/types";

export const inventoryService = {
  async getInventory(): Promise<{ items: InventoryItem[] }> {
    return api.get<{ items: InventoryItem[] }>("/inventory");
  },

  async stockIn(payload: { item_id: string; quantity: number; cost_per_unit?: number }) {
    return api.post("/inventory/stock-in", payload);
  },

  async logWaste(payload: { item_id: string; quantity: number; reason?: string }) {
    return api.post("/inventory/waste", payload);
  },
};
