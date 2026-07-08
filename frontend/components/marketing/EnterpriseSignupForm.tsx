"use client";

import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/Button";
import type { PublicPricingPlan } from "@/lib/types";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

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

function LabeledSelect({
  label,
  tooltip,
  error,
  children,
}: {
  label: string;
  tooltip?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        {tooltip ? <InfoTooltip label={label} text={tooltip} /> : null}
      </div>
      {children}
      {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
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
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", marketingTheme.eyebrow)}>
          Step 5 of 5
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Create your KhayaOS workspace</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Enterprise onboarding captures the business, operational, branding, and account details KhayaOS needs to
          provision your tenant, assign your plan, and send your welcome credentials.
        </p>
      </div>

      <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
        <SectionTitle
          title="Business identity"
          description="Legal and public-facing details for your restaurant workspace."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Restaurant name"
            tooltip="The public-facing name customers will see on your menu, ordering app, and receipts."
            error={errors.restaurant_name?.message}
            {...register("restaurant_name")}
          />
          <Input
            label="Legal business name"
            tooltip="The registered legal name of your business, as it appears on official documents and invoices."
            error={errors.legal_business_name?.message}
            {...register("legal_business_name")}
          />
          <LabeledSelect
            label="Business type"
            tooltip="Helps KhayaOS tailor default settings and module recommendations for your operation."
          >
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
          </LabeledSelect>
          <Input
            label="Workspace slug"
            tooltip="A unique URL-friendly identifier for your workspace (e.g. khaya-kitchen). Used in your login URL and cannot be changed later."
            error={errors.slug?.message}
            {...register("slug")}
          />
          <Input
            label="Company registration number"
            error={errors.company_registration_number?.message}
            {...register("company_registration_number")}
          />
          <Input label="Tax / VAT number" error={errors.tax_vat_number?.message} {...register("tax_vat_number")} />
        </div>
      </section>

      <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
        <SectionTitle title="Location & locale" description="Where you operate and how you price orders." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Country"
            tooltip="The country where your primary kitchen or restaurant is located."
            error={errors.country?.message}
            {...register("country")}
          />
          <Input
            label="City"
            tooltip="The city or town of your main operating location."
            error={errors.city?.message}
            {...register("city")}
          />
          <Input
            label="Street address"
            className="md:col-span-2"
            tooltip="Full street address of your primary location, used for delivery zone setup and business records."
            error={errors.street_address?.message}
            {...register("street_address")}
          />
          <Input
            label="Postal code"
            tooltip="Postcode or ZIP code for your primary location."
            error={errors.postal_code?.message}
            {...register("postal_code")}
          />
          <Input
            label="Timezone"
            tooltip="Used to schedule order cut-offs, kitchen hours, and reporting. Example: Europe/London."
            error={errors.timezone?.message}
            {...register("timezone")}
          />
          <Input
            label="Currency"
            tooltip="The currency shown to customers and used in all pricing and reports. Example: GBP, USD, NGN."
            error={errors.currency?.message}
            placeholder="GBP"
            {...register("currency")}
          />
        </div>
      </section>

      <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
        <SectionTitle title="Owner account" description="Primary administrator credentials for your tenant." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Owner full name"
            tooltip="Full name of the primary account holder who will manage this workspace."
            error={errors.owner_name?.message}
            {...register("owner_name")}
          />
          <Input
            label="Role / title"
            tooltip="Your job title or role, e.g. Owner, General Manager, Head Chef."
            error={errors.owner_role_title?.message}
            {...register("owner_role_title")}
          />
          <Input
            label="Owner email"
            type="email"
            tooltip="Your login email address. A welcome email with your credentials will be sent here after signup."
            error={errors.owner_email?.message}
            {...register("owner_email")}
          />
          <Input
            label="Owner phone"
            tooltip="Contact number for account recovery and important platform notifications."
            error={errors.owner_phone?.message}
            {...register("owner_phone")}
          />
          <Input
            label="Password"
            type="password"
            tooltip="Minimum 8 characters. You will use this to log in to your KhayaOS admin dashboard."
            error={errors.owner_password?.message}
            {...register("owner_password")}
          />
          <Input
            label="Confirm password"
            type="password"
            tooltip="Re-enter your password to confirm it is correct."
            error={errors.owner_password_confirmation?.message}
            {...register("owner_password_confirmation")}
          />
        </div>
      </section>

      <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
        <SectionTitle title="Operations profile" description="How your kitchen runs day to day." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-sm font-medium">Order types offered</p>
              <InfoTooltip
                label="Order types offered"
                text="Select at least one. Pickup = customers collect orders. Delivery = orders sent to customer addresses."
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" className={marketingTheme.checkbox} {...register("order_types_pickup")} />
                Pickup
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" className={marketingTheme.checkbox} {...register("order_types_delivery")} />
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
            tooltip="Approximate number of orders you expect per day. Helps KhayaOS size your plan and set sensible defaults."
            error={errors.estimated_daily_orders?.message}
            {...register("estimated_daily_orders", { valueAsNumber: true })}
          />
          <Input
            label="Staff count"
            type="number"
            tooltip="Total number of staff who will use KhayaOS (kitchen, front-of-house, management)."
            error={errors.staff_count?.message}
            {...register("staff_count", { valueAsNumber: true })}
          />
          <Input
            label="Branch count"
            type="number"
            tooltip="Number of locations or branches you operate. Start with 1 if you have a single site."
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

      <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
        <SectionTitle title="Branding & plan" description="Launch appearance and subscription tier." />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Tagline (optional)" error={errors.tagline?.message} {...register("tagline")} />
          <Input label="Logo URL (optional)" error={errors.logo_url?.message} {...register("logo_url")} />
          <Input label="Primary color" error={errors.primary_color?.message} {...register("primary_color")} />
          <Input label="Secondary color" error={errors.secondary_color?.message} {...register("secondary_color")} />
          <div className="md:col-span-2">
            <LabeledSelect
              label="Subscription plan"
              tooltip="Choose the plan that matches your operation size. You can upgrade or change your plan later from the admin dashboard."
              error={errors.plan_id?.message}
            >
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
            </LabeledSelect>
          </div>
        </div>
      </section>

      <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
        <label className="flex items-start gap-3">
          <input type="checkbox" className={cn("mt-1", marketingTheme.checkbox)} {...register("terms_accepted")} />
          <span className="text-sm text-zinc-300">
            I agree to the KhayaOS terms of service and confirm the information provided is accurate for tenant
            provisioning.
          </span>
        </label>
        {errors.terms_accepted?.message ? (
          <p className="text-sm text-red-400">{errors.terms_accepted.message}</p>
        ) : null}
        <label className="flex items-start gap-3">
          <input type="checkbox" className={cn("mt-1", marketingTheme.checkbox)} {...register("marketing_opt_in")} />
          <span className="text-sm text-zinc-300">
            Keep me updated about KhayaOS product news, campaigns, and best practices.
          </span>
        </label>
      </section>

      <Button type="submit" className={cn("w-full sm:w-auto", marketingTheme.primaryButton)} size="lg" isLoading={isSubmitting}>
        Create my KhayaOS workspace
      </Button>
    </form>
  );
}
