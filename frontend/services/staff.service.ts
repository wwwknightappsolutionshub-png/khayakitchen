import { api } from "@/lib/api-client";
import type { StaffUser } from "@/lib/types";

export const staffService = {
  async getStaff(): Promise<{ users: StaffUser[] }> {
    return api.get<{ users: StaffUser[] }>("/staff");
  },

  async createStaff(payload: {
    name: string;
    email: string;
    password: string;
    role: "owner" | "manager" | "kitchen" | "staff";
  }): Promise<{ user: StaffUser }> {
    return api.post<{ user: StaffUser }>("/staff", payload);
  },

  async updateStaff(
    id: string,
    payload: {
      name?: string;
      role?: "owner" | "manager" | "kitchen" | "staff";
      status?: "active" | "disabled";
      password?: string;
    },
  ): Promise<{ user: StaffUser }> {
    return api.put<{ user: StaffUser }>(`/staff/${id}`, payload);
  },
};
