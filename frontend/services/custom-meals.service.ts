import { api } from "@/lib/api-client";
import type { CustomMealRequest } from "@/lib/types";

export const customMealsService = {
  async listForStaff() {
    return api.get<{ requests: CustomMealRequest[] }>("/custom-meal-requests");
  },

  async updateStatus(
    id: string,
    payload: { status: "submitted" | "acknowledged" | "closed"; staff_note?: string },
  ) {
    return api.patch<{ request: CustomMealRequest }>(`/custom-meal-requests/${id}`, payload);
  },
};
