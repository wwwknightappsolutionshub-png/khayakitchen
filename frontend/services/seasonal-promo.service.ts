import { api } from "@/lib/api-client";

export interface SeasonalPromo {
  id: string;
  tenant_id?: string;
  image_url?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  details?: string | null;
  cta_label?: string | null;
  meal_id?: string | null;
  is_published: boolean;
}

export const seasonalPromoService = {
  get() {
    return api.get<{ promo: SeasonalPromo; free_until?: string | null; entitled: boolean }>(
      "/seasonal-promo",
    );
  },

  update(payload: Partial<SeasonalPromo>) {
    return api.patch<{ promo: SeasonalPromo }>("/seasonal-promo", payload);
  },

  uploadImage(file: File) {
    const form = new FormData();
    form.append("image", file);
    return api.upload<{ promo: SeasonalPromo }>("/seasonal-promo/image", form);
  },
};
