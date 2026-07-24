"use client";

import Link from "next/link";
import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Gift,
  MapPin,
  MessageCircle,
  LogOut,
  Copy,
  Smartphone,
  Utensils,
} from "lucide-react";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { CustomerInput } from "@/components/customer/CustomerInput";
import { KitchenReviewForm } from "@/components/customer/KitchenReviewForm";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import { useStorefront } from "@/hooks/useStorefront";
import { customerAuthService } from "@/services/customer-auth.service";
import { customerOrdersService } from "@/services/customer-orders.service";
import { loyaltyService } from "@/services/loyalty.service";
import { requestPwaInstallUi } from "@/lib/pwa-install";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiClientError } from "@/lib/api-client";
import type { CustomerAddress } from "@/lib/types";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const NAME_STORAGE_KEY = "khayaos-customer-name";
const EMAIL_STORAGE_KEY = "khayaos-customer-email";
const WELCOME_STORAGE_KEY = "khayaos-welcome-seen";

function readStoredPhone(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
}

function formatAddressLine(a: CustomerAddress): string {
  return [a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(", ");
}

function referralAbsoluteUrl(menuUrl: string): string {
  if (typeof window === "undefined") return menuUrl;
  if (menuUrl.startsWith("http")) return menuUrl;
  return `${window.location.origin}${menuUrl.startsWith("/") ? "" : "/"}${menuUrl}`;
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const openCustomerChat = useUiStore((s) => s.openCustomerChat);
  const { data: storefront } = useStorefront();
  const restaurantName = storefront?.branding?.restaurant_name ?? "Khaya Kitchen";
  const activeOrderId = useCartStore((s) => s.activeOrderId);
  const loadOrderIntoCart = useCartStore((s) => s.loadOrderIntoCart);

  const [hasSession, setHasSession] = useState(() => !!customerAuthService.getSessionToken());
  const [guestMode, setGuestMode] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">(
    searchParams.get("signup") === "1" ? "signup" : "signin",
  );
  const [authStep, setAuthStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(readStoredPhone);
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(NAME_STORAGE_KEY) ?? "";
  });
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
  });
  const [otp, setOtp] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  const [submittedPhone, setSubmittedPhone] = useState<string | null>(() => {
    const stored = readStoredPhone();
    return stored || null;
  });
  const [reorderTarget, setReorderTarget] = useState<string | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [phoneChange, setPhoneChange] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"idle" | "otp">("idle");
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [addrLine1, setAddrLine1] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrMsg, setAddrMsg] = useState<string | null>(null);
  const [mealTitle, setMealTitle] = useState("");
  const [mealMessage, setMealMessage] = useState("");
  const [mealConstraints, setMealConstraints] = useState("");
  const [mealMsg, setMealMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

  useEffect(() => {
    setHasSession(!!customerAuthService.getSessionToken());
  }, []);

  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    error: meErr,
  } = useQuery({
    queryKey: ["customer-account-me"],
    queryFn: () => customerAuthService.me(),
    enabled: hasSession,
    retry: false,
  });

  useEffect(() => {
    if (!meError) return;
    if (meErr instanceof ApiClientError && (meErr.status === 401 || meErr.status === 403)) {
      customerAuthService.setSessionToken(null);
      setHasSession(false);
    }
  }, [meError, meErr]);

  useEffect(() => {
    if (!me?.customer) return;
    setProfileName(me.customer.name ?? "");
    setProfileEmail(me.customer.email ?? "");
    if (me.customer.phone) localStorage.setItem(PHONE_STORAGE_KEY, me.customer.phone);
    if (me.customer.name) localStorage.setItem(NAME_STORAGE_KEY, me.customer.name);
    if (me.customer.email) localStorage.setItem(EMAIL_STORAGE_KEY, me.customer.email);
  }, [me?.customer]);

  const { data: notifPrefs } = useQuery({
    queryKey: ["customer-notif-prefs"],
    queryFn: () => customerAuthService.getNotificationPreferences(),
    enabled: hasSession,
  });

  const { data: customMeals } = useQuery({
    queryKey: ["customer-custom-meals"],
    queryFn: () => customerAuthService.myCustomMeals(),
    enabled: hasSession,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", submittedPhone],
    queryFn: () => customerOrdersService.getOrders(submittedPhone!),
    enabled: guestMode && !!submittedPhone && !hasSession,
  });

  const guestCustomerId = ordersData?.customer_id;
  const { data: guestLoyalty } = useQuery({
    queryKey: ["loyalty", guestCustomerId, submittedPhone],
    queryFn: () => loyaltyService.getCustomerAccount(guestCustomerId!, submittedPhone!),
    enabled: guestMode && !!guestCustomerId && !!submittedPhone && !hasSession,
  });

  const requestOtpMutation = useMutation({
    mutationFn: () =>
      customerAuthService.requestOtp({
        phone: phone.trim(),
        email: email.trim() || undefined,
        name: name.trim() || undefined,
        mode: authMode,
      }),
    onSuccess: (res) => {
      setAuthError(null);
      setAuthInfo(`Code sent via ${res.channel}. Expires in ${res.expires_in_seconds}s.`);
      setAuthStep("otp");
      localStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      if (name.trim()) localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      if (email.trim()) localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
    },
    onError: (err: Error) => {
      setAuthInfo(null);
      setAuthError(err.message || "Could not send code.");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () =>
      customerAuthService.verifyOtp({
        phone: phone.trim(),
        otp: otp.trim(),
        email: email.trim() || undefined,
      }),
    onSuccess: () => {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
      setHasSession(true);
      setGuestMode(false);
      setAuthStep("phone");
      setOtp("");
      setAuthError(null);
      setAuthInfo(null);
      queryClient.invalidateQueries({ queryKey: ["customer-account-me"] });
    },
    onError: (err: Error) => {
      setAuthError(err.message || "Invalid code.");
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (points: number) => customerAuthService.redeem(points),
    onSuccess: () => {
      setRedeemMsg("Points redeemed.");
      setRedeemPoints("");
      queryClient.invalidateQueries({ queryKey: ["customer-account-me"] });
    },
    onError: (err: Error) => setRedeemMsg(err.message || "Redeem failed."),
  });

  const optInMutation = useMutation({
    mutationFn: () => {
      const customerId = me?.customer.id;
      const p = me?.customer.phone ?? phone;
      if (!customerId || !p) throw new Error("Missing customer details");
      return loyaltyService.optIn(customerId, p);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-account-me"] }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      customerAuthService.updateMe({
        name: profileName.trim() || undefined,
        email: profileEmail.trim() || undefined,
      }),
    onSuccess: () => {
      setProfileMsg("Profile saved.");
      queryClient.invalidateQueries({ queryKey: ["customer-account-me"] });
    },
    onError: (err: Error) => setProfileMsg(err.message || "Could not save."),
  });

  const requestPhoneMutation = useMutation({
    mutationFn: () => customerAuthService.requestPhoneChange(phoneChange.trim()),
    onSuccess: () => {
      setPhoneMsg("Code sent to your email.");
      setPhoneStep("otp");
    },
    onError: (err: Error) => setPhoneMsg(err.message || "Could not send code."),
  });

  const confirmPhoneMutation = useMutation({
    mutationFn: () => customerAuthService.confirmPhoneChange(phoneChange.trim(), phoneOtp.trim()),
    onSuccess: (res) => {
      setPhoneMsg("Phone updated.");
      setPhoneStep("idle");
      setPhoneOtp("");
      setPhoneChange("");
      if (res.customer.phone) localStorage.setItem(PHONE_STORAGE_KEY, res.customer.phone);
      queryClient.invalidateQueries({ queryKey: ["customer-account-me"] });
    },
    onError: (err: Error) => setPhoneMsg(err.message || "Could not confirm."),
  });

  const saveAddressMutation = useMutation({
    mutationFn: () =>
      customerAuthService.saveAddress({
        line1: addrLine1.trim(),
        city: addrCity.trim() || undefined,
        label: addrLabel.trim() || undefined,
        is_default: true,
      }),
    onSuccess: () => {
      setAddrMsg("Address saved as default.");
      setAddrLine1("");
      setAddrCity("");
      queryClient.invalidateQueries({ queryKey: ["customer-account-me"] });
    },
    onError: (err: Error) => setAddrMsg(err.message || "Could not save address."),
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: (id: string) => customerAuthService.saveAddress({ is_default: true }, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-account-me"] }),
  });

  const customMealMutation = useMutation({
    mutationFn: () =>
      customerAuthService.submitCustomMeal({
        title: mealTitle.trim() || undefined,
        message: mealMessage.trim(),
        constraints: mealConstraints.trim() || undefined,
      }),
    onSuccess: () => {
      setMealMsg("Request sent to the kitchen.");
      setMealTitle("");
      setMealMessage("");
      setMealConstraints("");
      queryClient.invalidateQueries({ queryKey: ["customer-custom-meals"] });
    },
    onError: (err: Error) => setMealMsg(err.message || "Could not submit."),
  });

  const prefsMutation = useMutation({
    mutationFn: (payload: {
      push_enabled?: boolean;
      whatsapp_enabled?: boolean;
      email_enabled?: boolean;
    }) => customerAuthService.updateNotificationPreferences(payload),
    onSuccess: () => {
      setPrefsMsg("Preferences saved.");
      queryClient.invalidateQueries({ queryKey: ["customer-notif-prefs"] });
    },
    onError: (err: Error) => setPrefsMsg(err.message || "Could not update."),
  });

  const logoutMutation = useMutation({
    mutationFn: () => customerAuthService.logout(),
    onSuccess: () => {
      setHasSession(false);
      queryClient.removeQueries({ queryKey: ["customer-account-me"] });
    },
  });

  const loadGuestHistory = () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    localStorage.setItem(PHONE_STORAGE_KEY, trimmed);
    setSubmittedPhone(trimmed);
    setGuestMode(true);
  };

  const handleOrderAgain = async (orderId: string, phoneForOrder: string) => {
    setReorderLoading(true);
    setReorderError(null);
    try {
      const { order } = await customerOrdersService.getOrder(orderId, phoneForOrder);
      if (!order.items?.length) {
        setReorderError("This order has no items to reorder.");
        return;
      }
      loadOrderIntoCart(order);
      setReorderTarget(null);
      router.push("/cart");
    } catch {
      setReorderError("Could not load order details. Try again.");
    } finally {
      setReorderLoading(false);
    }
  };

  const copyReferral = async (menuUrl: string) => {
    try {
      await navigator.clipboard.writeText(referralAbsoluteUrl(menuUrl));
      setCopyMsg("Referral link copied.");
    } catch {
      setCopyMsg("Could not copy — select the link manually.");
    }
  };

  // ——— Auth (no session) ———
  if (!hasSession && !guestMode) {
    return (
      <div className="customer-animate-in px-4 pt-6 pb-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {authMode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in to {restaurantName} for loyalty, addresses, and faster checkout
          </p>
        </header>

        <div className="mb-4 flex gap-2">
          <CustomerButton
            variant={authMode === "signin" ? "primary" : "secondary"}
            className="flex-1"
            onClick={() => {
              setAuthMode("signin");
              setAuthStep("phone");
              setAuthError(null);
            }}
          >
            Sign in
          </CustomerButton>
          <CustomerButton
            variant={authMode === "signup" ? "primary" : "secondary"}
            className="flex-1"
            onClick={() => {
              setAuthMode("signup");
              setAuthStep("phone");
              setAuthError(null);
            }}
          >
            Sign up
          </CustomerButton>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
          {authStep === "phone" ? (
            <>
              {authMode === "signup" && (
                <>
                  <CustomerInput
                    label="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                  />
                  <CustomerInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </>
              )}
              {authMode === "signin" && (
                <CustomerInput
                  label="Email (if used for OTP)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              )}
              <CustomerInput
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44..."
                autoComplete="tel"
              />
              <CustomerButton
                className="w-full"
                isLoading={requestOtpMutation.isPending}
                disabled={
                  !phone.trim() ||
                  (authMode === "signup" && (!name.trim() || !email.trim()))
                }
                onClick={() => requestOtpMutation.mutate()}
              >
                Send code
              </CustomerButton>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--muted)]">
                Enter the code sent for {phone.trim()}
              </p>
              <CustomerInput
                label="One-time code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <CustomerButton
                className="w-full"
                isLoading={verifyOtpMutation.isPending}
                disabled={!otp.trim()}
                onClick={() => verifyOtpMutation.mutate()}
              >
                Verify &amp; continue
              </CustomerButton>
              <CustomerButton
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setAuthStep("phone");
                  setOtp("");
                  setAuthError(null);
                }}
              >
                Back
              </CustomerButton>
            </>
          )}
          {authInfo && <p className="text-sm text-emerald-400">{authInfo}</p>}
          {authError && <p className="text-sm text-red-400">{authError}</p>}
        </div>

        <button
          type="button"
          className="mt-6 w-full text-center text-xs text-[var(--muted)] underline-offset-2 hover:underline"
          onClick={() => setGuestMode(true)}
        >
          Just load order history by phone (no login)
        </button>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          Business owner?{" "}
          <Link href="/login" className="text-[var(--secondary)] underline-offset-2 hover:underline">
            Admin login
          </Link>
        </p>
      </div>
    );
  }

  // ——— Guest load-by-phone (no session) ———
  if (!hasSession && guestMode) {
    const orders = ordersData?.orders ?? [];
    const points = guestLoyalty?.loyalty?.points_balance ?? 0;
    const stamps = guestLoyalty?.loyalty?.stamps_balance ?? 0;

    return (
      <div className="customer-animate-in px-4 pt-6 pb-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Order history</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Look up past orders without signing in
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <label className="mb-2 block text-sm font-medium">Your phone number</label>
          <div className="flex gap-2">
            <CustomerInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44..."
              className="flex-1"
            />
            <CustomerButton onClick={loadGuestHistory} disabled={!phone.trim()}>
              Load
            </CustomerButton>
          </div>
        </div>

        {guestCustomerId && (
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[var(--secondary)]" />
              <h2 className="font-semibold">Loyalty</h2>
            </div>
            <p className="text-sm">
              {points} points · {stamps} stamps
            </p>
          </div>
        )}

        {submittedPhone && (
          <div className="mb-6">
            <h2 className="mb-3 font-semibold">Orders</h2>
            {ordersLoading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
            {!ordersLoading && orders.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No orders found</p>
            )}
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <CustomerRouteLink
                      href={`/tracking?id=${order.id}`}
                      className="min-w-0 flex-1 transition-colors hover:text-[var(--primary)]"
                    >
                      <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs capitalize text-[var(--muted)]">
                        {order.status.replace(/_/g, " ")} · {order.order_type}
                      </p>
                      <p className="font-mono text-sm">{formatCurrency(order.total_amount)}</p>
                      <p className="text-xs text-[var(--muted)]">{formatDate(order.created_at)}</p>
                    </CustomerRouteLink>
                    <CustomerButton
                      variant="secondary"
                      className="shrink-0 text-xs"
                      onClick={() => setReorderTarget(order.id)}
                      disabled={reorderLoading}
                    >
                      Order again
                    </CustomerButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reorderTarget && submittedPhone && (
          <ReorderModal
            loading={reorderLoading}
            error={reorderError}
            onCancel={() => setReorderTarget(null)}
            onConfirm={() => handleOrderAgain(reorderTarget, submittedPhone)}
          />
        )}

        <CustomerButton
          variant="secondary"
          className="w-full"
          onClick={() => {
            setGuestMode(false);
            setAuthMode("signin");
          }}
        >
          Sign in for full account
        </CustomerButton>
      </div>
    );
  }

  // ——— Logged-in dashboard ———
  if (meLoading) {
    return (
      <div className="customer-animate-in px-4 pt-6">
        <p className="text-sm text-[var(--muted)]">Loading your account…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="customer-animate-in px-4 pt-6 space-y-4">
        <p className="text-sm text-red-400">Could not load your account. Please try again.</p>
        <CustomerButton
          onClick={() => queryClient.invalidateQueries({ queryKey: ["customer-account-me"] })}
        >
          Retry
        </CustomerButton>
        <CustomerButton variant="ghost" onClick={() => logoutMutation.mutate()}>
          Sign out
        </CustomerButton>
      </div>
    );
  }

  const customer = me.customer;
  const loyaltyBlock = me.loyalty;
  const loyalty = loyaltyBlock?.loyalty;
  const points = loyalty?.points_balance ?? 0;
  const stamps = loyalty?.stamps_balance ?? 0;
  const packages = loyaltyBlock?.packages ?? [];
  const progressRows = loyaltyBlock?.progress ?? [];
  const orders = me.orders ?? [];
  const addresses = me.addresses ?? [];
  const install = me.install_claim;
  const prefs = notifPrefs?.preferences;
  const reorderPhone = customer.phone ?? phone;

  return (
    <div className="customer-animate-in px-4 pt-6 pb-12">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{customer.name ? `, ${customer.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Your {restaurantName} account</p>
        </div>
        <CustomerButton
          variant="ghost"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </CustomerButton>
      </header>

      {activeOrderId && (
        <CustomerRouteLink
          href={`/tracking?id=${activeOrderId}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors duration-200 hover:border-[var(--primary)]/30"
        >
          <Package className="h-5 w-5 text-[var(--primary)]" />
          <div>
            <p className="font-medium">Active order</p>
            <p className="text-xs text-[var(--muted)]">#{activeOrderId.slice(0, 8).toUpperCase()}</p>
          </div>
        </CustomerRouteLink>
      )}

      {/* Loyalty */}
      {loyaltyBlock && (
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gift className="h-5 w-5 text-[var(--secondary)]" />
            <h2 className="font-semibold">Loyalty rewards</h2>
          </div>
          <p className="mb-2 text-xs capitalize text-[var(--muted)]">
            Status: {loyalty?.membership_status ?? "prospect"}
            {loyalty?.tier ? ` · Tier ${loyalty.tier}` : ""}
          </p>
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            <span>{points} points</span>
            <span>{stamps} stamps</span>
            <span>{loyaltyBlock.completed_orders ?? 0} completed orders</span>
          </div>
          {loyaltyBlock.can_opt_in && (
            <CustomerButton
              className="mb-3"
              onClick={() => optInMutation.mutate()}
              disabled={optInMutation.isPending}
            >
              Join loyalty program
            </CustomerButton>
          )}
          {packages.length > 0 && (
            <div className="mb-4 space-y-3">
              {packages.map((pkg) => {
                const row = progressRows.find((p) => p.loyalty_package_id === pkg.id);
                const current = row?.current_progress ?? 0;
                const goal = pkg.goal_value || 1;
                const pct = Math.min((current / goal) * 100, 100);
                return (
                  <div key={pkg.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{pkg.name}</span>
                      <span>
                        {current}/{goal} → {pkg.reward_label}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--secondary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <CustomerInput
              type="number"
              min={1}
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              placeholder="Points to redeem"
              className="flex-1"
            />
            <CustomerButton
              disabled={!redeemPoints || Number(redeemPoints) < 1 || redeemMutation.isPending}
              isLoading={redeemMutation.isPending}
              onClick={() => {
                setRedeemMsg(null);
                redeemMutation.mutate(Number(redeemPoints));
              }}
            >
              Redeem
            </CustomerButton>
          </div>
          {redeemMsg && <p className="mt-2 text-xs text-[var(--muted)]">{redeemMsg}</p>}
        </div>
      )}

      {/* App install */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="font-semibold">App on this device</h2>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {me.app_installed || install?.app_installed
            ? "Installed — you’re set for push updates and loyalty perks."
            : "Not installed yet. Add the app for a faster experience."}
        </p>
        {install?.eligible && !install.app_installed && (
          <CustomerButton className="mt-3 w-full" onClick={() => requestPwaInstallUi()}>
            Install &amp; claim {install.points} points
          </CustomerButton>
        )}
        {install?.eligible && install.app_installed && !install.claimed && (
          <CustomerButton
            className="mt-3 w-full"
            onClick={() => {
              void import("@/lib/pwa-install").then((m) => m.tryClaimPwaInstallReward()).then(() => {
                queryClient.invalidateQueries({ queryKey: ["customer-account-me"] });
              });
            }}
          >
            Claim {install.points} install points
          </CustomerButton>
        )}
      </div>

      {/* Orders */}
      <div className="mb-4">
        <h2 className="mb-3 font-semibold">Recent orders</h2>
        {orders.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No orders yet</p>
        )}
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <CustomerRouteLink
                  href={`/tracking?id=${order.id}`}
                  className="min-w-0 flex-1 transition-colors hover:text-[var(--primary)]"
                >
                  <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs capitalize text-[var(--muted)]">
                    {order.status.replace(/_/g, " ")} · {order.order_type}
                  </p>
                  <p className="font-mono text-sm">{formatCurrency(order.total_amount)}</p>
                  {order.created_at && (
                    <p className="text-xs text-[var(--muted)]">{formatDate(order.created_at)}</p>
                  )}
                </CustomerRouteLink>
                <div className="flex shrink-0 flex-col gap-1">
                  <CustomerButton
                    variant="secondary"
                    className="text-xs"
                    onClick={() => router.push(`/tracking?id=${order.id}`)}
                  >
                    Track
                  </CustomerButton>
                  <CustomerButton
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setReorderTarget(order.id)}
                    disabled={reorderLoading}
                  >
                    Reorder
                  </CustomerButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral */}
      {me.referral && (
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-semibold">Refer a friend</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Share your link — you earn {me.referral.points_credit} points
            {me.referral.stamp_credit ? ` / ${me.referral.stamp_credit} stamps` : ""} when they order.
          </p>
          <p className="mb-2 break-all text-xs text-[var(--muted)]">
            {referralAbsoluteUrl(me.referral.menu_url)}
          </p>
          <CustomerButton
            variant="secondary"
            className="w-full"
            onClick={() => copyReferral(me.referral!.menu_url)}
          >
            <Copy className="h-4 w-4" />
            Copy referral link
          </CustomerButton>
          {copyMsg && <p className="mt-2 text-xs text-[var(--muted)]">{copyMsg}</p>}
        </div>
      )}

      {/* Chat */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="font-semibold">Chat with {restaurantName}</h2>
        </div>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Ask about orders, allergens, or special requests.
        </p>
        <CustomerButton className="w-full" onClick={openCustomerChat}>
          Open chat
        </CustomerButton>
      </div>

      {/* Notification prefs */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 font-semibold">Notifications</h2>
        <label className="mb-3 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Push notifications</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--secondary)]"
            checked={!!prefs?.push_enabled}
            onChange={(e) => {
              setPrefsMsg(null);
              prefsMutation.mutate({ push_enabled: e.target.checked });
            }}
          />
        </label>
        <label className="mb-3 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">WhatsApp updates</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--secondary)]"
            checked={!!prefs?.whatsapp_enabled}
            onChange={(e) => {
              setPrefsMsg(null);
              prefsMutation.mutate({ whatsapp_enabled: e.target.checked });
            }}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">Email updates</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--secondary)]"
            checked={!!prefs?.email_enabled}
            onChange={(e) => {
              setPrefsMsg(null);
              prefsMutation.mutate({ email_enabled: e.target.checked });
            }}
          />
        </label>
        {prefsMsg && <p className="mt-2 text-xs text-[var(--muted)]">{prefsMsg}</p>}
      </div>

      {/* Addresses */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="font-semibold">Address book</h2>
        </div>
        {addresses.length === 0 && (
          <p className="mb-3 text-sm text-[var(--muted)]">No saved addresses yet</p>
        )}
        <ul className="mb-4 space-y-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {a.label || "Address"}
                  {a.is_default ? (
                    <span className="ml-2 text-xs text-[var(--secondary)]">Default</span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--muted)]">{formatAddressLine(a)}</p>
              </div>
              {!a.is_default && (
                <CustomerButton
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  disabled={setDefaultAddressMutation.isPending}
                  onClick={() =>
                    setDefaultAddressMutation.mutate(a.id)
                  }
                >
                  Set default
                </CustomerButton>
              )}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <CustomerInput
            label="New address"
            value={addrLine1}
            onChange={(e) => setAddrLine1(e.target.value)}
            placeholder="Street address"
          />
          <CustomerInput
            value={addrCity}
            onChange={(e) => setAddrCity(e.target.value)}
            placeholder="City"
          />
          <CustomerInput
            value={addrLabel}
            onChange={(e) => setAddrLabel(e.target.value)}
            placeholder="Label (Home, Work)"
          />
          <CustomerButton
            className="w-full"
            disabled={!addrLine1.trim() || saveAddressMutation.isPending}
            isLoading={saveAddressMutation.isPending}
            onClick={() => {
              setAddrMsg(null);
              saveAddressMutation.mutate();
            }}
          >
            Save as default
          </CustomerButton>
          {addrMsg && <p className="text-xs text-[var(--muted)]">{addrMsg}</p>}
        </div>
      </div>

      {/* Custom meal */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-[var(--secondary)]" />
          <h2 className="font-semibold">Custom meal request</h2>
        </div>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Tell the kitchen what you’d like — they’ll follow up.
        </p>
        <div className="space-y-2">
          <CustomerInput
            value={mealTitle}
            onChange={(e) => setMealTitle(e.target.value)}
            placeholder="Title (optional)"
          />
          <textarea
            className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm"
            value={mealMessage}
            onChange={(e) => setMealMessage(e.target.value)}
            placeholder="Describe your meal…"
          />
          <CustomerInput
            value={mealConstraints}
            onChange={(e) => setMealConstraints(e.target.value)}
            placeholder="Allergies / constraints (optional)"
          />
          <CustomerButton
            className="w-full"
            disabled={!mealMessage.trim() || customMealMutation.isPending}
            isLoading={customMealMutation.isPending}
            onClick={() => {
              setMealMsg(null);
              customMealMutation.mutate();
            }}
          >
            Submit request
          </CustomerButton>
          {mealMsg && <p className="text-xs text-[var(--muted)]">{mealMsg}</p>}
        </div>
        {(customMeals?.requests?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
            {customMeals!.requests.slice(0, 5).map((r) => (
              <li key={r.id} className="text-xs text-[var(--muted)]">
                <span className="capitalize text-[var(--foreground)]">{r.status}</span>
                {r.title ? ` · ${r.title}` : ""} — {r.message.slice(0, 80)}
                {r.message.length > 80 ? "…" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Profile */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 font-semibold">Profile</h2>
        <div className="space-y-2">
          <CustomerInput
            label="Name"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
          <CustomerInput
            label="Email"
            type="email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
          />
          <CustomerButton
            className="w-full"
            isLoading={updateProfileMutation.isPending}
            onClick={() => {
              setProfileMsg(null);
              updateProfileMutation.mutate();
            }}
          >
            Save profile
          </CustomerButton>
          {profileMsg && <p className="text-xs text-[var(--muted)]">{profileMsg}</p>}
        </div>

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Change phone</h3>
          <p className="mb-2 text-xs text-[var(--muted)]">Current: {customer.phone ?? "—"}</p>
          {phoneStep === "idle" ? (
            <div className="flex gap-2">
              <CustomerInput
                type="tel"
                value={phoneChange}
                onChange={(e) => setPhoneChange(e.target.value)}
                placeholder="New phone"
                className="flex-1"
              />
              <CustomerButton
                disabled={!phoneChange.trim() || requestPhoneMutation.isPending}
                isLoading={requestPhoneMutation.isPending}
                onClick={() => {
                  setPhoneMsg(null);
                  requestPhoneMutation.mutate();
                }}
              >
                Send OTP
              </CustomerButton>
            </div>
          ) : (
            <div className="space-y-2">
              <CustomerInput
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value)}
                placeholder="OTP code"
                inputMode="numeric"
              />
              <div className="flex gap-2">
                <CustomerButton
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setPhoneStep("idle");
                    setPhoneOtp("");
                  }}
                >
                  Cancel
                </CustomerButton>
                <CustomerButton
                  className="flex-1"
                  disabled={!phoneOtp.trim() || confirmPhoneMutation.isPending}
                  isLoading={confirmPhoneMutation.isPending}
                  onClick={() => confirmPhoneMutation.mutate()}
                >
                  Confirm
                </CustomerButton>
              </div>
            </div>
          )}
          {phoneMsg && <p className="mt-2 text-xs text-[var(--muted)]">{phoneMsg}</p>}
        </div>
      </div>

      <KitchenReviewForm />

      <CustomerRouteLink href="/tracking" className="mt-6 block">
        <CustomerButton variant="secondary" className="w-full">
          Track Orders
        </CustomerButton>
      </CustomerRouteLink>

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        Business owner?{" "}
        <Link href="/login" className="text-[var(--secondary)] underline-offset-2 hover:underline">
          Admin login
        </Link>
      </p>

      {reorderTarget && reorderPhone && (
        <ReorderModal
          loading={reorderLoading}
          error={reorderError}
          onCancel={() => setReorderTarget(null)}
          onConfirm={() => handleOrderAgain(reorderTarget, reorderPhone)}
        />
      )}
    </div>
  );
}

function ReorderModal({
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 customer-animate-in">
        <h2 className="text-lg font-semibold">Order again?</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          We&apos;ll add your previous items to the cart so you can review before checkout.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-6 flex gap-2">
          <CustomerButton variant="ghost" className="flex-1" onClick={onCancel}>
            Cancel
          </CustomerButton>
          <CustomerButton className="flex-1" isLoading={loading} onClick={onConfirm}>
            Add to cart
          </CustomerButton>
        </div>
      </div>
    </div>
  );
}
