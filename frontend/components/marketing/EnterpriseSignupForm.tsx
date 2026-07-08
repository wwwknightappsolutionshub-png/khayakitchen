"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/Button";
import { PasswordInput, isStrongPassword } from "@/components/ui/PasswordInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FeatureExplainerSlide } from "@/components/marketing/FeatureExplainerSlide";
import type { PublicPricingPlan } from "@/lib/types";
import { KHAYA_FEATURE_SLIDES } from "@/lib/khayaos-features";
import { CURRENCIES } from "@/lib/currencies";
import { isPostalCodeRequired } from "@/lib/postal-code-policy";
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
    country_iso: z.string().min(2, "Country is required"),
    country: z.string().min(2, "Country is required"),
    state_code: z.string().optional(),
    state: z.string().optional(),
    city: z.string().min(2, "City is required"),
    street_address: z.string().min(5, "Street address is required"),
    postal_code: z.string().optional(),
    timezone: z.string().min(2, "Timezone is required"),
    currency: z.string().min(3, "Currency is required"),
    owner_name: z.string().min(2, "Owner name is required"),
    owner_email: z.string().email("Valid email is required"),
    owner_phone: z
      .string()
      .min(7, "Phone number is required")
      .regex(/^[+\d][\d\s().-]{6,}$/, "Enter a valid phone number"),
    owner_role_title: z.string().min(2, "Role/title is required"),
    owner_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine(isStrongPassword, "Password must meet all security requirements"),
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
  })
  .superRefine((data, ctx) => {
    if (!isPostalCodeRequired(data.country_iso)) return;
    if (!data.postal_code || data.postal_code.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Postal code is required for this country",
        path: ["postal_code"],
      });
    }
  });

export type EnterpriseSignupFormValues = z.infer<typeof signupSchema>;

interface EnterpriseSignupFormProps {
  plans: PublicPricingPlan[];
  defaultPlanId?: string;
  isSubmitting?: boolean;
  onSubmit: (values: EnterpriseSignupFormValues) => void;
  startAtForm?: boolean;
}

type CountryRow = {
  name: string;
  isoCode: string;
  phonecode: string;
  currency: string;
  timezones?: Array<{ zoneName: string }>;
};

type StateRow = {
  name: string;
  isoCode: string;
  countryCode: string;
};

type CityRow = {
  name: string;
  stateCode: string;
  countryCode: string;
};

/** Educational intro slides shown before the data-entry phases. */
const FEATURE_LABELS = ["Operations", "Customer", "Growth", "Platform"];
const FEATURE_COUNT = KHAYA_FEATURE_SLIDES.length;

const SIGNUP_PHASES = [
  { id: "business", short: "Business", title: "Business identity", description: "Legal and public-facing details for your workspace." },
  { id: "location", short: "Location", title: "Location & locale", description: "Where you operate and how you price orders." },
  { id: "owner", short: "Account", title: "Owner account", description: "Primary administrator credentials for your tenant." },
  { id: "operations", short: "Profile", title: "Operations profile", description: "How your kitchen runs day to day." },
  { id: "launch", short: "Launch", title: "Branding & launch", description: "Appearance, plan selection, and terms." },
] as const;

const TOTAL_STEPS = FEATURE_COUNT + SIGNUP_PHASES.length;

const STEP_LABELS = [...FEATURE_LABELS, ...SIGNUP_PHASES.map((phase) => phase.short)];

const PHASE_FIELDS: Record<number, (keyof EnterpriseSignupFormValues)[]> = {
  0: ["restaurant_name", "legal_business_name", "business_type", "slug", "company_registration_number", "tax_vat_number"],
  1: ["country_iso", "country", "state_code", "state", "city", "street_address", "postal_code", "timezone", "currency"],
  2: [
    "owner_name",
    "owner_role_title",
    "owner_email",
    "owner_phone",
    "owner_password",
    "owner_password_confirmation",
  ],
  3: [
    "order_types_pickup",
    "order_types_delivery",
    "estimated_daily_orders",
    "staff_count",
    "branch_count",
    "average_order_value",
  ],
  4: [
    "tagline",
    "logo_url",
    "primary_color",
    "secondary_color",
    "plan_id",
    "terms_accepted",
    "marketing_opt_in",
  ],
};

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

function UnifiedProgress({ currentStep, label }: { currentStep: number; label: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((stepLabel, index) => (
          <div key={stepLabel + index} className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                index < currentStep && "bg-orange-600",
                index === currentStep && "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500",
                index > currentStep && "bg-white/10",
              )}
            />
            <p
              className={cn(
                "mt-2 hidden text-center text-[10px] font-medium sm:block",
                index === currentStep ? "text-amber-100" : "text-zinc-500",
              )}
            >
              {stepLabel}
            </p>
          </div>
        ))}
      </div>
      <p className={cn("mt-3 text-sm font-semibold uppercase tracking-[0.18em]", marketingTheme.eyebrow)}>
        Step {currentStep + 1} of {TOTAL_STEPS} — {label}
      </p>
    </div>
  );
}

export function EnterpriseSignupForm({
  plans,
  defaultPlanId,
  isSubmitting,
  onSubmit,
  startAtForm = false,
}: EnterpriseSignupFormProps) {
  const [step, setStep] = useState(startAtForm ? FEATURE_COUNT : 0);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [geoReady, setGeoReady] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<EnterpriseSignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      business_type: "restaurant",
      country_iso: "",
      country: "",
      state_code: "",
      state: "",
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
  const countryIso = watch("country_iso");
  const stateCode = watch("state_code");
  const ownerPassword = watch("owner_password");
  const postalRequired = isPostalCodeRequired(countryIso);

  const isFeatureStep = step < FEATURE_COUNT;
  const phase = step - FEATURE_COUNT;
  const isLastStep = step === TOTAL_STEPS - 1;
  const currentLabel = isFeatureStep
    ? KHAYA_FEATURE_SLIDES[step].title
    : SIGNUP_PHASES[phase].title;

  useEffect(() => {
    if (defaultPlanId) setValue("plan_id", defaultPlanId);
  }, [defaultPlanId, setValue]);

  useEffect(() => {
    if (!restaurantName || slug) return;
    setValue("slug", slugify(restaurantName));
  }, [restaurantName, slug, setValue]);

  useEffect(() => {
    let active = true;
    import("country-state-city")
      .then(({ Country }) => {
        if (!active) return;
        setCountries(Country.getAllCountries() as CountryRow[]);
        setGeoReady(true);
      })
      .catch(() => setGeoReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!countryIso) {
      setStates([]);
      setCities([]);
      return;
    }
    import("country-state-city").then(({ State, City }) => {
      const nextStates = State.getStatesOfCountry(countryIso) as StateRow[];
      setStates(nextStates);
      if (nextStates.length === 0) {
        setCities(City.getCitiesOfCountry(countryIso) as CityRow[]);
      } else {
        setCities([]);
      }
    });
  }, [countryIso]);

  useEffect(() => {
    if (!countryIso || !stateCode) {
      if (!stateCode) setCities([]);
      return;
    }
    import("country-state-city").then(({ City }) => {
      setCities(City.getCitiesOfState(countryIso, stateCode) as CityRow[]);
    });
  }, [countryIso, stateCode]);

  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        value: country.isoCode,
        label: country.name,
        meta: country.currency,
      })),
    [countries],
  );

  const stateOptions = useMemo(
    () =>
      states.map((state) => ({
        value: state.isoCode,
        label: state.name,
      })),
    [states],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        value: city.name,
        label: city.name,
      })),
    [cities],
  );

  const currencyOptions = useMemo(
    () =>
      CURRENCIES.map((currency) => ({
        value: currency.code,
        label: `${currency.code} — ${currency.name}`,
        meta: currency.symbol,
      })),
    [],
  );

  const applyCountryDefaults = useCallback(
    (isoCode: string) => {
      const country = countries.find((row) => row.isoCode === isoCode);
      if (!country) return;

      setValue("country_iso", isoCode, { shouldValidate: true });
      setValue("country", country.name, { shouldValidate: true });
      setValue("state_code", "");
      setValue("state", "");
      setValue("city", "");
      setValue("postal_code", "");

      if (country.currency) {
        setValue("currency", country.currency, { shouldValidate: true });
      }
      const zone = country.timezones?.[0]?.zoneName;
      if (zone) {
        setValue("timezone", zone, { shouldValidate: true });
      }

      const currentPhone = watch("owner_phone");
      if (!currentPhone && country.phonecode) {
        setValue("owner_phone", `+${country.phonecode} `, { shouldValidate: false });
      }
    },
    [countries, setValue, watch],
  );

  const applyStateSelection = useCallback(
    (code: string) => {
      const state = states.find((row) => row.isoCode === code);
      setValue("state_code", code, { shouldValidate: true });
      setValue("state", state?.name ?? "", { shouldValidate: true });
      setValue("city", "");
    },
    [setValue, states],
  );

  const goNext = async () => {
    if (isFeatureStep) {
      setStep((current) => Math.min(TOTAL_STEPS - 1, current + 1));
      return;
    }
    const valid = await trigger(PHASE_FIELDS[phase]);
    if (!valid) return;
    setStep((current) => Math.min(TOTAL_STEPS - 1, current + 1));
  };

  const goPrev = () => setStep((current) => Math.max(0, current - 1));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <UnifiedProgress currentStep={step} label={currentLabel} />

      {isFeatureStep ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(FEATURE_COUNT)}
              className={cn("text-sm font-medium underline-offset-4 hover:underline", marketingTheme.link)}
            >
              Skip intro → go to signup form
            </button>
          </div>
          <FeatureExplainerSlide slide={KHAYA_FEATURE_SLIDES[step]} />
        </div>
      ) : (
        <section className={cn("space-y-4 rounded-2xl border p-5", marketingTheme.surfaceBorder, marketingTheme.surface)}>
          <SectionTitle title={SIGNUP_PHASES[phase].title} description={SIGNUP_PHASES[phase].description} />

          {phase === 0 ? (
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
              <LabeledSelect label="Business type" tooltip="Helps KhayaOS tailor default settings for your operation.">
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
                tooltip="Unique URL-friendly identifier for your workspace (e.g. khaya-kitchen)."
                error={errors.slug?.message}
                {...register("slug")}
              />
              <Input label="Company registration number" {...register("company_registration_number")} />
              <Input label="Tax / VAT number" {...register("tax_vat_number")} />
            </div>
          ) : null}

          {phase === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SearchableSelect
                label="Country"
                tooltip="The country where your primary kitchen or restaurant is located."
                placeholder={geoReady ? "Select country" : "Loading countries…"}
                value={countryIso}
                options={countryOptions}
                error={errors.country_iso?.message ?? errors.country?.message}
                onChange={applyCountryDefaults}
              />
              {states.length > 0 ? (
                <SearchableSelect
                  label="State / province"
                  tooltip="Select your state or province to load available cities."
                  placeholder="Select state / province"
                  value={stateCode ?? ""}
                  options={stateOptions}
                  disabled={!countryIso}
                  onChange={applyStateSelection}
                />
              ) : null}
              <SearchableSelect
                label="City"
                tooltip="City or town of your main operating location."
                placeholder={countryIso ? "Select city" : "Select a country first"}
                value={watch("city")}
                options={cityOptions}
                disabled={!countryIso || (states.length > 0 && !stateCode)}
                error={errors.city?.message}
                onChange={(value) => setValue("city", value, { shouldValidate: true })}
              />
              <Input
                label="Street address"
                className="md:col-span-2"
                tooltip="Full street address of your primary location."
                error={errors.street_address?.message}
                {...register("street_address")}
              />
              <Input
                label={postalRequired ? "Postal code" : "Postal code (optional)"}
                tooltip={
                  postalRequired
                    ? "Required for UK, Canada, and European countries."
                    : "Optional for your selected country."
                }
                error={errors.postal_code?.message}
                {...register("postal_code")}
              />
              <Input
                label="Timezone"
                tooltip="Used for order cut-offs, kitchen hours, and reporting."
                error={errors.timezone?.message}
                {...register("timezone")}
              />
              <SearchableSelect
                label="Currency"
                tooltip="Currency shown to customers and used in pricing and reports."
                placeholder="Select currency"
                value={watch("currency")}
                options={currencyOptions}
                error={errors.currency?.message}
                onChange={(value) => setValue("currency", value, { shouldValidate: true })}
              />
            </div>
          ) : null}

          {phase === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Owner full name" error={errors.owner_name?.message} {...register("owner_name")} />
              <Input label="Role / title" error={errors.owner_role_title?.message} {...register("owner_role_title")} />
              <Input
                label="Owner email"
                type="email"
                tooltip="Login email. Welcome credentials are sent here after signup."
                error={errors.owner_email?.message}
                {...register("owner_email")}
              />
              <Input
                label="Owner phone"
                type="tel"
                required
                tooltip="Required contact number for account recovery and notifications."
                error={errors.owner_phone?.message}
                {...register("owner_phone")}
              />
              <PasswordInput
                label="Password"
                tooltip="Must include upper & lower case, a number, and a special character."
                error={errors.owner_password?.message}
                value={ownerPassword}
                {...register("owner_password")}
              />
              <PasswordInput
                label="Confirm password"
                showStrength={false}
                error={errors.owner_password_confirmation?.message}
                {...register("owner_password_confirmation")}
              />
            </div>
          ) : null}

          {phase === 3 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <p className="text-sm font-medium">Order types offered</p>
                  <InfoTooltip label="Order types offered" text="Select at least one order type." />
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
                error={errors.estimated_daily_orders?.message}
                {...register("estimated_daily_orders", { valueAsNumber: true })}
              />
              <Input label="Staff count" type="number" error={errors.staff_count?.message} {...register("staff_count", { valueAsNumber: true })} />
              <Input label="Branch count" type="number" error={errors.branch_count?.message} {...register("branch_count", { valueAsNumber: true })} />
              <Input
                label="Average order value (optional)"
                type="number"
                step="0.01"
                error={errors.average_order_value?.message}
                {...register("average_order_value", { valueAsNumber: true })}
              />
            </div>
          ) : null}

          {phase === 4 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tagline (optional)" error={errors.tagline?.message} {...register("tagline")} />
                <Input label="Logo URL (optional)" error={errors.logo_url?.message} {...register("logo_url")} />
                <Input label="Primary color" error={errors.primary_color?.message} {...register("primary_color")} />
                <Input label="Secondary color" error={errors.secondary_color?.message} {...register("secondary_color")} />
                <div className="md:col-span-2">
                  <LabeledSelect label="Subscription plan" error={errors.plan_id?.message}>
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
              <label className="flex items-start gap-3">
                <input type="checkbox" className={cn("mt-1", marketingTheme.checkbox)} {...register("terms_accepted")} />
                <span className="text-sm text-zinc-300">
                  I agree to the KhayaOS terms of service and confirm the information provided is accurate.
                </span>
              </label>
              {errors.terms_accepted?.message ? (
                <p className="text-sm text-red-400">{errors.terms_accepted.message}</p>
              ) : null}
              <label className="flex items-start gap-3">
                <input type="checkbox" className={cn("mt-1", marketingTheme.checkbox)} {...register("marketing_opt_in")} />
                <span className="text-sm text-zinc-300">
                  Keep me updated about KhayaOS product news and best practices.
                </span>
              </label>
            </div>
          ) : null}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          className={marketingTheme.secondaryButton}
          onClick={goPrev}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {isLastStep ? (
          <Button type="submit" className={marketingTheme.primaryButton} size="lg" isLoading={isSubmitting}>
            Create my KhayaOS workspace
          </Button>
        ) : (
          <Button type="button" className={marketingTheme.primaryButton} size="lg" onClick={goNext}>
            {isFeatureStep ? "Continue" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
