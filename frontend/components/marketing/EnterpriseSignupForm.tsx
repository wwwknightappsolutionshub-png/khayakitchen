"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { ColorField } from "@/components/ui/ColorField";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/Button";
import { PasswordInput, isStrongPassword } from "@/components/ui/PasswordInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FeatureExplainerSlide } from "@/components/marketing/FeatureExplainerSlide";
import type { PublicPricingPlan } from "@/lib/types";
import { KHAYA_FEATURE_SLIDES } from "@/lib/khayaos-features";
import { CURRENCIES, currencyForCountryIso, resolveSignupCurrency } from "@/lib/currencies";
import { isPostalCodeRequired } from "@/lib/postal-code-policy";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";
import { signupService } from "@/services/signup.service";
import { ApiClientError } from "@/lib/api-client";

const signupSchema = z
  .object({
    restaurant_name: z.string().min(2, "Restaurant name is required"),
    legal_business_name: z.string().min(2, "Legal business name is required"),
    business_type: z.enum(["restaurant", "cafe", "cloud_kitchen", "catering", "franchise", "other"]),
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
    tagline: z.string().max(160).optional(),
    primary_color: z.string().max(20).optional(),
    secondary_color: z.string().max(20).optional(),
    terms_accepted: z.boolean().refine((value) => value === true, {
      message: "You must accept the terms",
    }),
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
  onSubmit: (values: EnterpriseSignupFormValues, logoFile?: File | null) => void;
  startAtForm?: boolean;
  plansLoading?: boolean;
  plansUnavailable?: boolean;
  plansErrorMessage?: string | null;
  onRetryPlans?: () => void;
  apiError?: string | null;
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
  { id: "launch", short: "Launch", title: "Branding & launch", description: "Optional logo and tagline, workspace colors, and your plan." },
] as const;

const TOTAL_STEPS = FEATURE_COUNT + SIGNUP_PHASES.length;

const STEP_LABELS = [...FEATURE_LABELS, ...SIGNUP_PHASES.map((phase) => phase.short)];

const PHASE_FIELDS: Record<number, (keyof EnterpriseSignupFormValues)[]> = {
  0: ["restaurant_name", "legal_business_name", "business_type", "slug"],
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
  ],
  4: [
    "tagline",
    "primary_color",
    "secondary_color",
    "plan_id",
    "terms_accepted",
    "marketing_opt_in",
  ],
};

const FIELD_LABELS: Partial<Record<keyof EnterpriseSignupFormValues, string>> = {
  restaurant_name: "Restaurant name",
  legal_business_name: "Legal business name",
  business_type: "Business type",
  slug: "Workspace slug",
  country_iso: "Country",
  country: "Country",
  state_code: "State / province",
  state: "State / province",
  city: "City",
  street_address: "Street address",
  postal_code: "Postal code",
  timezone: "Timezone",
  currency: "Currency",
  owner_name: "Owner full name",
  owner_email: "Owner email",
  owner_phone: "Owner phone",
  owner_role_title: "Role / title",
  owner_password: "Password",
  owner_password_confirmation: "Confirm password",
  plan_id: "Subscription plan",
  order_types_pickup: "Order types",
  order_types_delivery: "Order types",
  estimated_daily_orders: "Daily orders",
  staff_count: "Staff count",
  branch_count: "Branch count",
  terms_accepted: "Terms of service",
};

function phaseForFieldName(fieldName: string): number {
  for (const [phaseKey, fields] of Object.entries(PHASE_FIELDS)) {
    if (fields.includes(fieldName as keyof EnterpriseSignupFormValues)) {
      return Number(phaseKey);
    }
  }
  return 0;
}

const LOGO_ACCEPT = "image/jpeg,image/jpg,image/png,image/svg+xml,.jpeg,.jpg,.png,.svg";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/svg+xml"]);

const CREATE_TIPS = [
  "Spinning up your kitchen workspace…",
  "Wiring menu, orders, and inventory…",
  "Polishing your brand for customers…",
  "Almost ready — plating the finishing touches…",
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function CreatingWorkspaceOverlay({ kitchenName }: { kitchenName?: string }) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % CREATE_TIPS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0a0806]/55 px-6 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/25 bg-[#14100c] px-6 py-8 text-center shadow-2xl">
        <div className="signup-create-orbit mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-orange-500 to-rose-500 text-3xl font-bold text-white shadow-lg shadow-orange-500/30">
          K
        </div>
        <p className="text-lg font-semibold text-amber-50">
          {kitchenName?.trim() ? `Building ${kitchenName.trim()}` : "Building your kitchen"}
        </p>
        <p className="mt-2 min-h-[2.5rem] text-sm text-amber-100/75">{CREATE_TIPS[tipIndex]}</p>
        <div className="mx-auto mt-5 h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/10">
          <div className="signup-create-progress h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  const { theme } = useMarketingTheme();
  return (
    <div className={cn("border-b pb-4", theme.surfaceBorder)}>
      <h3 className={cn("text-lg font-semibold", theme.heading)}>{title}</h3>
      <p className={cn("mt-1 text-sm", theme.muted)}>{description}</p>
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
  const { theme, mode } = useMarketingTheme();
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
                index > currentStep && (mode === "light" ? "bg-stone-200" : "bg-white/10"),
              )}
            />
            <p
              className={cn(
                "mt-2 hidden text-center text-[10px] font-medium sm:block",
                index === currentStep
                  ? mode === "light"
                    ? "text-amber-900"
                    : "text-amber-100"
                  : theme.subtle,
              )}
            >
              {stepLabel}
            </p>
          </div>
        ))}
      </div>
      <p className={cn("mt-3 text-sm font-semibold uppercase tracking-[0.18em]", theme.eyebrow)}>
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
  plansLoading = false,
  plansUnavailable = false,
  plansErrorMessage = null,
  onRetryPlans,
  apiError = null,
}: EnterpriseSignupFormProps) {
  const { theme } = useMarketingTheme();
  const [step, setStep] = useState(startAtForm ? FEATURE_COUNT : 0);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [geoReady, setGeoReady] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [submitValidationError, setSubmitValidationError] = useState<string | null>(null);
  const slugManuallyEditedRef = useRef(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    setFocus,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EnterpriseSignupFormValues>({
    resolver: zodResolver(signupSchema),
    shouldFocusError: true,
    defaultValues: {
      business_type: "restaurant",
      country_iso: "",
      country: "",
      state_code: "",
      state: "",
      timezone: "Europe/London",
      currency: "",
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

  // Sticky submit banner must clear as soon as the user edits any field.
  useEffect(() => {
    const subscription = watch(() => {
      setSubmitValidationError((prev) => (prev ? null : prev));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const restaurantName = watch("restaurant_name");
  const countryIso = watch("country_iso");
  const stateCode = watch("state_code");
  const ownerPassword = watch("owner_password");
  const ownerPasswordConfirmation = watch("owner_password_confirmation");
  const postalRequired = isPostalCodeRequired(countryIso);

  const isFeatureStep = step < FEATURE_COUNT;
  const phase = step - FEATURE_COUNT;
  const isLastStep = step === TOTAL_STEPS - 1;
  const currentLabel = isFeatureStep
    ? KHAYA_FEATURE_SLIDES[step].title
    : SIGNUP_PHASES[phase].title;

  useEffect(() => {
    if (defaultPlanId) setValue("plan_id", defaultPlanId);
    else if (plans[0]?.id) setValue("plan_id", plans[0].id);
  }, [defaultPlanId, plans, setValue]);

  useEffect(() => {
    if (!restaurantName || slugManuallyEditedRef.current) return;
    setValue("slug", slugify(restaurantName), { shouldValidate: true });
  }, [restaurantName, setValue]);

  const slugField = register("slug");
  const handleSlugChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      slugManuallyEditedRef.current = true;
      void slugField.onChange(event);
    },
    [slugField],
  );

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
        setValue("currency", resolveSignupCurrency(isoCode, country.currency), { shouldValidate: true });
      } else {
        const mapped = currencyForCountryIso(isoCode);
        if (mapped) {
          setValue("currency", mapped, { shouldValidate: true });
        }
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

  const jumpToFirstError = useCallback(
    (fieldErrors: Record<string, unknown>) => {
      const firstField = Object.keys(fieldErrors)[0];
      if (!firstField) {
        setSubmitValidationError("Please review the form and fix any missing or invalid fields.");
        return;
      }
      const targetPhase = phaseForFieldName(firstField);
      const label =
        FIELD_LABELS[firstField as keyof EnterpriseSignupFormValues] ??
        firstField.replace(/_/g, " ");
      setStep(FEATURE_COUNT + targetPhase);
      setSubmitValidationError(`Please fix “${label}” before creating your workspace.`);
      window.setTimeout(() => {
        try {
          setFocus(firstField as keyof EnterpriseSignupFormValues);
        } catch {
          /* field may not be focusable */
        }
        const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    },
    [setFocus],
  );

  const [availabilityChecking, setAvailabilityChecking] = useState(false);

  const goNext = async () => {
    setSubmitValidationError(null);
    if (isFeatureStep) {
      setStep((current) => Math.min(TOTAL_STEPS - 1, current + 1));
      return;
    }
    const valid = await trigger(PHASE_FIELDS[phase]);
    if (!valid) return;

    // Progressive server checks: slug on Business, email on Account.
    try {
      if (phase === 0) {
        setAvailabilityChecking(true);
        const slug = (watch("slug") || "").trim().toLowerCase();
        const result = await signupService.checkSlug(slug);
        if (!result.available) {
          setError("slug", { type: "manual", message: result.message });
          setSubmitValidationError(result.message);
          return;
        }
      }
      if (phase === 2) {
        setAvailabilityChecking(true);
        const email = (watch("owner_email") || "").trim().toLowerCase();
        const result = await signupService.checkEmail(email);
        if (!result.available) {
          setError("owner_email", { type: "manual", message: result.message });
          setSubmitValidationError(result.message);
          return;
        }
      }
    } catch (err) {
      setSubmitValidationError(
        err instanceof ApiClientError
          ? err.message
          : "Could not verify availability. Check your connection and try again.",
      );
      return;
    } finally {
      setAvailabilityChecking(false);
    }

    setStep((current) => Math.min(TOTAL_STEPS - 1, current + 1));
  };

  const goPrev = () => {
    setSubmitValidationError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  const onValidSubmit = (values: EnterpriseSignupFormValues) => {
    if (logoError) {
      setSubmitValidationError(logoError);
      return;
    }
    setSubmitValidationError(null);
    onSubmit(values, logoFile);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLogoError(null);
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    const okExt = ext === "jpeg" || ext === "jpg" || ext === "png" || ext === "svg";
    // Some mobile browsers omit MIME or use image/pjpeg — fall back to extension.
    const mimeOk =
      !file.type || LOGO_MIME.has(file.type) || file.type === "image/pjpeg";
    if (!mimeOk && !okExt) {
      setLogoError("Upload a JPEG, JPG, PNG, or SVG image only.");
      event.target.value = "";
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("Logo must be 2MB or smaller.");
      event.target.value = "";
      return;
    }
    setLogoFile(file);
    setLogoPreview(null);
    // Data URL avoids blob: revoke races (Strict Mode / remount) and CSP blocks on blob:.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setLogoError("Could not preview this image. Try a different JPEG, PNG, or SVG.");
        return;
      }
      setLogoPreview(reader.result);
    };
    reader.onerror = () => {
      setLogoError("Could not read this file. Try a different JPEG, PNG, or SVG.");
      setLogoFile(null);
      setLogoPreview(null);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onValidSubmit, (fieldErrors) => jumpToFirstError(fieldErrors))}
      className="relative space-y-6"
      noValidate
    >
      {isSubmitting ? <CreatingWorkspaceOverlay kitchenName={restaurantName} /> : null}
      <UnifiedProgress currentStep={step} label={currentLabel} />

      {isFeatureStep ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(FEATURE_COUNT)}
              className={cn("text-sm font-medium underline-offset-4 hover:underline", theme.link)}
            >
              Skip intro → go to signup form
            </button>
          </div>
          <FeatureExplainerSlide slide={KHAYA_FEATURE_SLIDES[step]} />
        </div>
      ) : (
        <section className={cn("space-y-4 rounded-2xl border p-5", theme.surfaceBorder, theme.surface)}>
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
                  className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm text-[var(--foreground)]"
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
                tooltip="Auto-generated from your restaurant name. Edit only if you need a custom URL."
                error={errors.slug?.message}
                name={slugField.name}
                ref={slugField.ref}
                onBlur={slugField.onBlur}
                onChange={handleSlugChange}
              />
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
              {postalRequired ? (
                <Input
                  label="City"
                  tooltip="Type your city or town. Required for UK, Canada, and European countries that use postal codes."
                  placeholder={countryIso ? "Enter city" : "Select a country first"}
                  disabled={!countryIso}
                  error={errors.city?.message}
                  {...register("city")}
                />
              ) : (
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
              )}
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
                tooltip="Locked to the country you selected. Customers and kitchen reports use this currency."
                placeholder="Select country first"
                value={watch("currency")}
                options={currencyOptions}
                error={errors.currency?.message}
                onChange={(value) => setValue("currency", value, { shouldValidate: true })}
                disabled={Boolean(currencyForCountryIso(countryIso))}
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
                value={ownerPasswordConfirmation}
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
                  <label className={cn("flex items-center gap-2 text-sm", theme.body)}>
                    <input type="checkbox" className={theme.checkbox} {...register("order_types_pickup")} />
                    Pickup
                  </label>
                  <label className={cn("flex items-center gap-2 text-sm", theme.body)}>
                    <input type="checkbox" className={theme.checkbox} {...register("order_types_delivery")} />
                    Delivery
                  </label>
                </div>
                {errors.order_types_pickup?.message ? (
                  <p className="mt-1 text-sm text-red-400">{errors.order_types_pickup.message}</p>
                ) : null}
              </div>
              <Input
                label="Daily orders you take per day"
                type="number"
                error={errors.estimated_daily_orders?.message}
                {...register("estimated_daily_orders", { valueAsNumber: true })}
              />
              <Input
                label="How many staff do you have"
                type="number"
                error={errors.staff_count?.message}
                {...register("staff_count", { valueAsNumber: true })}
              />
              <Input
                label="How many branches do you have"
                type="number"
                error={errors.branch_count?.message}
                {...register("branch_count", { valueAsNumber: true })}
              />
            </div>
          ) : null}

          {phase === 4 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tagline (optional)" error={errors.tagline?.message} {...register("tagline")} />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-medium text-foreground">Upload your logo (optional)</label>
                    <InfoTooltip
                      label="Upload your logo"
                      text="Optional. JPEG, JPG, PNG, or SVG only. Max 2MB. Used as your kitchen profile avatar and customer menu header logo. You can remove a selected file with the clear control."
                    />
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={LOGO_ACCEPT}
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-foreground file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                  />
                  {logoPreview || logoFile ? (
                    <div className="mt-2 flex items-center gap-3">
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-16 w-16 rounded-xl border border-border object-contain bg-surface-elevated"
                          onError={() => {
                            setLogoError(
                              "Preview failed for this file. Use a standard JPEG, PNG, or SVG under 2MB.",
                            );
                            setLogoPreview(null);
                          }}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface-elevated px-1 text-center text-[10px] text-muted">
                          {logoFile?.name ?? "Selected"}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground hover:bg-danger/10 hover:text-danger"
                        aria-label="Remove uploaded logo"
                        title="Remove logo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {logoFile ? (
                        <p className={cn("min-w-0 flex-1 truncate text-xs", theme.muted)}>
                          {logoFile.name}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {logoError ? <p className="text-xs text-danger">{logoError}</p> : null}
                  <p className={cn("text-xs", theme.muted)}>Optional · JPEG, JPG, PNG, SVG · max 2MB</p>
                </div>
                <ColorField
                  label="Primary color"
                  value={watch("primary_color") || "#1A1A2E"}
                  onChange={(hex) => setValue("primary_color", hex, { shouldValidate: true })}
                  error={errors.primary_color?.message}
                />
                <ColorField
                  label="Secondary color"
                  value={watch("secondary_color") || "#E94560"}
                  onChange={(hex) => setValue("secondary_color", hex, { shouldValidate: true })}
                  error={errors.secondary_color?.message}
                />
                <div className="md:col-span-2">
                  <LabeledSelect label="Subscription plan" error={errors.plan_id?.message}>
                    <select
                      className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm text-[var(--foreground)]"
                      {...register("plan_id")}
                      disabled={plansLoading || plans.length === 0}
                    >
                      {plans.length === 0 ? (
                        <option value="">
                          {plansLoading ? "Loading plans…" : "No plans available"}
                        </option>
                      ) : (
                        plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))
                      )}
                    </select>
                  </LabeledSelect>
                  {plansUnavailable ? (
                    <div className="mt-3 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      <p>
                        {plansErrorMessage ??
                          "We could not load subscription plans. You can continue exploring KhayaOS, but plan selection is required before launch."}
                      </p>
                      <p className="mt-1 text-xs text-amber-100/80">
                        Contact{" "}
                        <a href="mailto:sales@khayaos.com" className="underline">
                          sales@khayaos.com
                        </a>{" "}
                        if this persists.
                      </p>
                      {onRetryPlans ? (
                        <button
                          type="button"
                          onClick={onRetryPlans}
                          className={cn("mt-2 text-xs font-semibold underline", theme.link)}
                        >
                          Retry loading plans
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <Controller
                name="terms_accepted"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name={field.name}
                      className={cn("mt-1 h-4 w-4 shrink-0", theme.checkbox)}
                      checked={field.value === true}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(event) => {
                        const accepted = event.target.checked;
                        field.onChange(accepted);
                        setSubmitValidationError(null);
                        if (accepted) {
                          clearErrors("terms_accepted");
                        }
                      }}
                    />
                    <span className={cn("text-sm", theme.body)}>
                      I agree to the KhayaOS terms of service and confirm the information provided is
                      accurate.
                    </span>
                  </label>
                )}
              />
              {errors.terms_accepted?.message ? (
                <p className="text-sm text-red-400">{errors.terms_accepted.message}</p>
              ) : null}
              <Controller
                name="marketing_opt_in"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name={field.name}
                      className={cn("mt-1 h-4 w-4 shrink-0", theme.checkbox)}
                      checked={field.value === true}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      onChange={(event) => {
                        field.onChange(event.target.checked);
                        setSubmitValidationError(null);
                      }}
                    />
                    <span className={cn("text-sm", theme.body)}>
                      Keep me updated about KhayaOS product news and best practices.
                    </span>
                  </label>
                )}
              />
            </div>
          ) : null}
        </section>
      )}

      {submitValidationError || apiError ? (
        <p className="rounded-[var(--radius)] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {submitValidationError || apiError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          className={theme.secondaryButton}
          onClick={goPrev}
          disabled={step === 0 || isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {isLastStep ? (
          <Button
            type="submit"
            className={theme.primaryButton}
            size="lg"
            disabled={plansUnavailable || isSubmitting}
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Preparing your kitchen…" : "Create my KhayaOS workspace"}
          </Button>
        ) : (
          <Button
            type="button"
            className={theme.primaryButton}
            size="lg"
            onClick={goNext}
            isLoading={availabilityChecking}
            disabled={availabilityChecking}
          >
            {isFeatureStep ? "Continue" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
