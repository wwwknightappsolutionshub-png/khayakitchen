"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EnterpriseSignupForm,
  type EnterpriseSignupFormValues,
} from "@/components/marketing/EnterpriseSignupForm";
import { pricingService } from "@/services/pricing.service";
import { signupService } from "@/services/signup.service";
import { ApiClientError } from "@/lib/api-client";

const REFERRAL_STORAGE_KEY = "khayaos-tenant-referral-code";

interface SignupWizardProps {
  startAtForm?: boolean;
}

export function SignupWizard({ startAtForm = false }: SignupWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [storedReferralCode, setStoredReferralCode] = useState<string | undefined>(undefined);

  const plansQuery = useQuery({
    queryKey: ["public-pricing", "signup"],
    queryFn: () => pricingService.getPublicPlans(),
    retry: 2,
  });

  const plans = plansQuery.data?.plans ?? [];
  const selectedPlanSlug = searchParams.get("plan") ?? undefined;
  const referralCode = (searchParams.get("ref") ?? "").trim().toUpperCase() || undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (referralCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);
      setStoredReferralCode(referralCode);
      return;
    }
    const existing = localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim().toUpperCase();
    setStoredReferralCode(existing || undefined);
  }, [referralCode]);

  const resolvedReferralCode = referralCode || storedReferralCode;

  const defaultPlanId = useMemo(() => {
    if (!selectedPlanSlug) return plans.find((plan) => plan.is_recommended)?.id ?? plans[0]?.id;
    return plans.find((plan) => plan.slug === selectedPlanSlug)?.id ?? plans[0]?.id;
  }, [plans, selectedPlanSlug]);

  const plansUnavailable =
    !plansQuery.isLoading && !plansQuery.isFetching && (plansQuery.isError || plans.length === 0);

  const plansErrorMessage =
    plansQuery.error instanceof ApiClientError
      ? plansQuery.error.message
      : plansUnavailable
        ? "Public pricing is unavailable right now."
        : null;

  const signupMutation = useMutation({
    mutationFn: signupService.register,
    onSuccess: (response) => {
      try {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams({
        email: response.owner_email,
        tenant: response.tenant.slug,
        kitchen: response.tenant.name,
      });
      router.replace(`/ops/verify-email-pending?${params.toString()}`);
    },
    onError: (error) => {
      setSubmitError(error instanceof ApiClientError ? error.message : "Signup failed. Please try again.");
    },
  });

  const handleSignup = (values: EnterpriseSignupFormValues, logoFile?: File | null) => {
    if (plans.length === 0) {
      setSubmitError("Select a subscription plan to continue. If plans do not load, contact sales@khayaos.com.");
      return;
    }

    setSubmitError(null);
    const orderTypes: Array<"pickup" | "delivery"> = [];
    if (values.order_types_pickup) orderTypes.push("pickup");
    if (values.order_types_delivery) orderTypes.push("delivery");

    signupMutation.mutate({
      restaurant_name: values.restaurant_name,
      legal_business_name: values.legal_business_name,
      business_type: values.business_type,
      slug: values.slug,
      country: values.country,
      state: values.state || undefined,
      city: values.city,
      street_address: values.street_address,
      postal_code: values.postal_code?.trim() || undefined,
      timezone: values.timezone,
      currency: values.currency.toUpperCase(),
      owner_name: values.owner_name,
      owner_email: values.owner_email,
      owner_phone: values.owner_phone,
      owner_role_title: values.owner_role_title,
      owner_password: values.owner_password,
      owner_password_confirmation: values.owner_password_confirmation,
      plan_id: values.plan_id,
      order_types: orderTypes,
      estimated_daily_orders: values.estimated_daily_orders,
      staff_count: values.staff_count,
      branch_count: values.branch_count,
      tagline: values.tagline || undefined,
      primary_color: values.primary_color || undefined,
      secondary_color: values.secondary_color || undefined,
      terms_accepted: values.terms_accepted,
      marketing_opt_in: values.marketing_opt_in,
      referral_code: resolvedReferralCode,
      logo: logoFile ?? null,
    });
  };

  return (
    <div className="space-y-4">
      <EnterpriseSignupForm
        plans={plans}
        defaultPlanId={defaultPlanId}
        isSubmitting={signupMutation.isPending}
        onSubmit={handleSignup}
        startAtForm={startAtForm}
        plansLoading={plansQuery.isLoading || plansQuery.isFetching}
        plansUnavailable={plansUnavailable}
        plansErrorMessage={plansErrorMessage}
        apiError={submitError}
        onRetryPlans={() => {
          void plansQuery.refetch();
        }}
      />
    </div>
  );
}
