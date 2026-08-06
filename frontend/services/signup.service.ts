import { api } from "@/lib/api-client";

export type SignupPayload = {
  restaurant_name: string;
  legal_business_name: string;
  business_type: "restaurant" | "cafe" | "cloud_kitchen" | "catering" | "franchise" | "other";
  company_registration_number?: string;
  tax_vat_number?: string;
  slug: string;
  country: string;
  state?: string;
  city: string;
  street_address: string;
  postal_code?: string;
  timezone: string;
  currency: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_role_title: string;
  owner_password: string;
  owner_password_confirmation: string;
  plan_id: string;
  order_types: Array<"pickup" | "delivery">;
  estimated_daily_orders: number;
  staff_count: number;
  branch_count: number;
  average_order_value?: number;
  tagline?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  terms_accepted: boolean;
  marketing_opt_in?: boolean;
  referral_code?: string;
  logo?: File | null;
};

export type SignupResponse = {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  plan: {
    id: string;
    name: string;
    slug: string;
  };
  login_url: string;
  owner_email: string;
  message: string;
};

function appendField(form: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    // Laravel `accepted` / `boolean` rules expect "1"/"0" or "yes"/"no"
    form.append(key, value ? "1" : "0");
    return;
  }
  form.append(key, String(value));
}

export const signupService = {
  checkSlug(slug: string) {
    return api.get<{ slug: string; available: boolean; message: string }>("/signup/check-slug", {
      params: { slug },
      skipAuth: true,
    });
  },

  checkEmail(email: string) {
    return api.get<{ email: string; available: boolean; message: string }>("/signup/check-email", {
      params: { email },
      skipAuth: true,
    });
  },

  register(payload: SignupPayload) {
    const form = new FormData();
    const { logo, order_types, ...rest } = payload;

    Object.entries(rest).forEach(([key, value]) => {
      appendField(form, key, value);
    });

    // Ensure terms is always an accepted value when the client validated it.
    if (payload.terms_accepted) {
      form.set("terms_accepted", "1");
    }

    order_types.forEach((type) => form.append("order_types[]", type));

    if (logo) {
      form.append("logo", logo);
    }

    return api.upload<SignupResponse>("/signup", form, { skipAuth: true });
  },
};
