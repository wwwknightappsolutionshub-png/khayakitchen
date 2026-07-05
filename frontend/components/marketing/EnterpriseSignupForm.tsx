"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { PublicPricingPlan } from "@/lib/types";

const signupSchema = z
  .object({
    restaurant_name: z.string().min(2, "Restaurant name is required"),
    legal_business_name: z.string().min(2, "Legal business name is required"),
    business_type: z.enum(["restaurant", "cafe", "cloud_kitchen", "catering", "franchise", "other"]),
    company_registration_number: z.string().optional(),
    tax_vat_number: z.string().optional(),
    slug: z
      .string()
      .min(2, "Workspace slug is required")
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
    country: z.string().min(2, "Country is required"),
    city: z.string().min(2, "City is required"),
    street_address: z.string().min(5, "Street address is required"),
    postal_code: z.string().min(2, "Postal code is required"),
    timezone: z.string().min(2, "Timezone is required"),
    currency: z.string().min(3, "Currency is required"),
    owner_name: z.string().min(2, "Owner name is required"),
    owner_email: z.string().email("Valid email is required"),
    owner_phone: z.string().min(7, "Phone number is required"),
    owner_role_title: z.string().min(2, "Role/title is required"),
    owner_password: z.string().min(8, "Password must be at least 8 characters"),
    owner_password_confirmation: z.string().min(8, "Confirm your password"),
    plan_id: z.string().uuid("Select a plan"),
    order_types_pickup: z.boolean(),
    order_types_delivery: z.boolean(),
    estimated_daily_orders: z.number().min(1).max(100000),
    staff_count: z.number().min(1).max(10000),
    branch_count: z.number().min(1).max(1000),
    average_order_value: z.number().min(0).optional(),
    tagline: z.string().max(160).optional(),
    primary_color: z.string().max(20).optional(),
    secondary_color: z.string().max(20).optional(),
    logo_url: z.string().url("Enter a valid logo URL").optional().or(z.literal("")),
    terms_accepted: z.boolean().refine((value) => value, "You must accept the terms"),
    marketing_opt_in: z.boolean().optional(),
  })
  .refine((data) => data.owner_password === data.owner_password_confirmation, {
    message: "Passwords do not match",
    path: ["owner_password_confirmation"],
  })
  .refine((data) => data.order_types_pickup || data.order_types_delivery, {
    message: "Select at least one order type",
    path: ["order_types_pickup"],
  });

export type EnterpriseSignupFormValues = z.infer<typeof signupSchema>;

interface EnterpriseSignupFormProps {
  plans: PublicPricingPlan[];
  defaultPlanId?: string;
  isSubmitting?: boolean;
  onSubmit: (values: EnterpriseSignupFormValues) => void;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-white/10 pb-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>
    </div>
  );
}

export function EnterpriseSignupForm({
  plans,
  defaultPlanId,
  isSubmitting,
  onSubmit,
}: EnterpriseSignupFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnterpriseSignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      business_type: "restaurant",
      timezone: "Europe/London",
      currency: "GBP",
      order_types_pickup: true,
      order_types_delivery: true,
      estimated_daily_orders: 50,
      staff_count: 5,
      branch_count: 1,
      primary_color: "#1a1a2e",
      secondary_color: "#e94560",
      plan_id: defaultPlanId ?? plans[0]?.id ?? "",
      terms_accepted: false,
      marketing_opt_in: true,
    },
  });

  const restaurantName = watch("restaurant_name");
  const slug = watch("slug");

  useEffect(() => {
    if (defaultPlanId) {
      setValue("plan_id", defaultPlanId);
    }
  }, [defaultPlanId, setValue]);

  useEffect(() => {
    if (!restaurantName || slug) return;
    setValue("slug", slugify(restaurantName));
  }, [restaurantName, slug, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Step 5 of 5</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Create your KhayaOS workspace</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Enterprise onboarding captures the business, operational, branding, and account details KhayaOS needs to
          provision your tenant, assign your plan, and send your welcome credentials.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <SectionTitle
          title="Business identity"
          description="Legal and public-facing details for your restaurant workspace."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Restaurant name" error={errors.restaurant_name?.message} {...register("restaurant_name")} />
          <Input
            label="Legal business name"
            error={errors.legal_business_name?.message}
            {...register("legal_business_name")}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Business type</label>
            <select
              className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm text-white"
              {...register("business_type")}
            >
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
              <option value="cloud_kitchen">Cloud kitchen</option>
              <option value="catering">Catering</option>
              <option value="franchise">Franchise</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input label="Workspace slug" error={errors.slug?.message} {...register("slug")} />
          <Input
            label="Company registration number"
            error={errors.company_registration_number?.message}
            {...register("company_registration_number")}
          />
          <Input label="Tax / VAT number" error={errors.tax_vat_number?.message} {...register("tax_vat_number")} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <SectionTitle title="Location & locale" description="Where you operate and how you price orders." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Country" error={errors.country?.message} {...register("country")} />
          <Input label="City" error={errors.city?.message} {...register("city")} />
          <Input
            label="Street address"
            className="md:col-span-2"
            error={errors.street_address?.message}
            {...register("street_address")}
          />
          <Input label="Postal code" error={errors.postal_code?.message} {...register("postal_code")} />
          <Input label="Timezone" error={errors.timezone?.message} {...register("timezone")} />
          <Input label="Currency" error={errors.currency?.message} placeholder="GBP" {...register("currency")} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <SectionTitle title="Owner account" description="Primary administrator credentials for your tenant." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Owner full name" error={errors.owner_name?.message} {...register("owner_name")} />
          <Input label="Role / title" error={errors.owner_role_title?.message} {...register("owner_role_title")} />
          <Input
            label="Owner email"
            type="email"
            error={errors.owner_email?.message}
            {...register("owner_email")}
          />
          <Input label="Owner phone" error={errors.owner_phone?.message} {...register("owner_phone")} />
          <Input
            label="Password"
            type="password"
            error={errors.owner_password?.message}
            {...register("owner_password")}
          />
          <Input
            label="Confirm password"
            type="password"
            error={errors.owner_password_confirmation?.message}
            {...register("owner_password_confirmation")}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <SectionTitle title="Operations profile" description="How your kitchen runs day to day." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium">Order types offered</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" className="accent-violet-500" {...register("order_types_pickup")} />
                Pickup
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" className="accent-violet-500" {...register("order_types_delivery")} />
                Delivery
              </label>
            </div>
            {errors.order_types_pickup?.message ? (
              <p className="mt-1 text-sm text-red-400">{errors.order_types_pickup.message}</p>
            ) : null}
          </div>
          <Input
            label="Estimated daily orders"
            type="number"
            error={errors.estimated_daily_orders?.message}
            {...register("estimated_daily_orders", { valueAsNumber: true })}
          />
          <Input
            label="Staff count"
            type="number"
            error={errors.staff_count?.message}
            {...register("staff_count", { valueAsNumber: true })}
          />
          <Input
            label="Branch count"
            type="number"
            error={errors.branch_count?.message}
            {...register("branch_count", { valueAsNumber: true })}
          />
          <Input
            label="Average order value (optional)"
            type="number"
            step="0.01"
            error={errors.average_order_value?.message}
            {...register("average_order_value", { valueAsNumber: true })}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <SectionTitle title="Branding & plan" description="Launch appearance and subscription tier." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Tagline (optional)" error={errors.tagline?.message} {...register("tagline")} />
          <Input label="Logo URL (optional)" error={errors.logo_url?.message} {...register("logo_url")} />
          <Input label="Primary color" error={errors.primary_color?.message} {...register("primary_color")} />
          <Input label="Secondary color" error={errors.secondary_color?.message} {...register("secondary_color")} />
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Subscription plan</label>
            <select
              className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm text-white"
              {...register("plan_id")}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            {errors.plan_id?.message ? <p className="mt-1 text-sm text-red-400">{errors.plan_id.message}</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 accent-violet-500" {...register("terms_accepted")} />
          <span className="text-sm text-zinc-300">
            I agree to the KhayaOS terms of service and confirm the information provided is accurate for tenant
            provisioning.
          </span>
        </label>
        {errors.terms_accepted?.message ? (
          <p className="text-sm text-red-400">{errors.terms_accepted.message}</p>
        ) : null}
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 accent-violet-500" {...register("marketing_opt_in")} />
          <span className="text-sm text-zinc-300">
            Keep me updated about KhayaOS product news, campaigns, and best practices.
          </span>
        </label>
      </section>

      <Button type="submit" className="w-full sm:w-auto" size="lg" isLoading={isSubmitting}>
        Create my KhayaOS workspace
      </Button>
    </form>
  );
}
