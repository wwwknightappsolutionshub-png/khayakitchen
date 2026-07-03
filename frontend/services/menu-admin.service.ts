import { api } from "@/lib/api-client";
import type { AdminMeal, AdminMealOption, AdminOptionGroup } from "@/lib/types";

export const menuAdminService = {
  async getAdminMenu(): Promise<{ meals: AdminMeal[] }> {
    return api.get<{ meals: AdminMeal[] }>("/menu/admin");
  },

  async createMeal(payload: {
    name: string;
    description?: string;
    image_url?: string;
    base_price?: number;
    is_active?: boolean;
  }): Promise<{ meal: AdminMeal }> {
    return api.post<{ meal: AdminMeal }>("/menu/meals", payload);
  },

  async updateMeal(
    id: string,
    payload: {
      name?: string;
      description?: string;
      image_url?: string;
      base_price?: number;
      is_active?: boolean;
    },
  ): Promise<{ meal: AdminMeal }> {
    return api.put<{ meal: AdminMeal }>(`/menu/meals/${id}`, payload);
  },

  async deleteMeal(id: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/menu/meals/${id}`);
  },

  async createOptionGroup(payload: {
    meal_id: string;
    name: string;
    type?: "single" | "multiple";
  }): Promise<{ option_group: AdminOptionGroup }> {
    return api.post<{ option_group: AdminOptionGroup }>("/menu/option-groups", payload);
  },

  async updateOptionGroup(
    id: string,
    payload: { name?: string; type?: "single" | "multiple" },
  ): Promise<{ option_group: AdminOptionGroup }> {
    return api.put<{ option_group: AdminOptionGroup }>(`/menu/option-groups/${id}`, payload);
  },

  async deleteOptionGroup(id: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/menu/option-groups/${id}`);
  },

  async createOption(payload: {
    option_group_id: string;
    name: string;
    price_delta?: number;
    is_active?: boolean;
  }): Promise<{ meal_option: AdminMealOption }> {
    return api.post<{ meal_option: AdminMealOption }>("/menu/options", payload);
  },

  async updateOption(
    id: string,
    payload: { name?: string; price_delta?: number; is_active?: boolean },
  ): Promise<{ meal_option: AdminMealOption }> {
    return api.put<{ meal_option: AdminMealOption }>(`/menu/options/${id}`, payload);
  },

  async deleteOption(id: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/menu/options/${id}`);
  },

  async uploadMealImage(mealId: string, file: File): Promise<{ meal: AdminMeal }> {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload<{ meal: AdminMeal }>(`/menu/meals/${mealId}/image`, formData);
  },
};
