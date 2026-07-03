import { api } from "@/lib/api-client";
import type { MenuResponse } from "@/lib/types";

export const menuService = {
  async getMenu(): Promise<MenuResponse> {
    return api.get<MenuResponse>("/menu", { skipAuth: true });
  },
};
