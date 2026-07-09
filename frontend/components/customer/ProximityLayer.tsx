"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { CustomerInput } from "@/components/customer/CustomerInput";
import {
  customerProximityService,
  readProximitySessionToken,
} from "@/services/customer-proximity.service";
import { tenantBrandingService } from "@/services/tenant-branding.service";
import type { ProximityBaitPayload } from "@/lib/types";
import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const HEARTBEAT_MS = 5 * 60 * 1000;

export function ProximityLayer() {
  const [authOpen, setAuthOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [bait, setBait] = useState<ProximityBaitPayload | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const heartbeatRef = useRef<number | undefined>(undefined);

  const storefrontQuery = useQuery({
    queryKey: ["storefront"],
    queryFn: () => tenantBrandingService.getStorefront(),
  });

  const proximityEnabled = storefrontQuery.data?.revenue_recovery?.proximity?.enabled ?? false;
  const maxAccuracy =
    storefrontQuery.data?.revenue_recovery?.proximity?.location_accuracy_max_meters ?? 500;

  useEffect(() => {
    if (typeof window === "undefined" || !proximityEnabled) return;
    const storedPhone = localStorage.getItem(PHONE_STORAGE_KEY);
    if (storedPhone) setPhone(storedPhone);
    if (!readProximitySessionToken()) {
      setAuthOpen(true);
    }
  }, [proximityEnabled]);

  const readPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60_000,
      });
    });

  const runProximityCycle = async () => {
    if (!readProximitySessionToken()) return;

    try {
      const position = await readPosition();
      const { latitude, longitude, accuracy } = position.coords;

      if (accuracy > maxAccuracy) {
        setLocationError("Location signal is too weak. Move closer to an open area and try again.");
        return;
      }

      setLocationError(null);
      await customerProximityService.setLocationOptIn(true);
      await customerProximityService.sendHeartbeat(latitude, longitude, Math.round(accuracy));

      const result = await customerProximityService.fetchBait(
        latitude,
        longitude,
        Math.round(accuracy),
      );

      if (result.bait) {
        setBait(result.bait);
      }
    } catch {
      setLocationError("Could not read your location. Check browser permissions.");
    }
  };

  useEffect(() => {
    if (!proximityEnabled || !readProximitySessionToken()) return;

    runProximityCycle();
    heartbeatRef.current = window.setInterval(runProximityCycle, HEARTBEAT_MS);

    return () => {
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proximityEnabled]);

  const requestOtp = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await customerProximityService.requestOtp(phone.trim(), email.trim());
      setOtpSent(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await customerProximityService.verifyOtp(phone.trim(), email.trim(), otp.trim());
      setAuthOpen(false);
      await runProximityCycle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Invalid verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  const dismissBait = async () => {
    if (bait) {
      await customerProximityService.dismiss(bait.campaign_id, bait.distance_km);
    }
    setBait(null);
  };

  if (!proximityEnabled) return null;

  return (
    <>
      {authOpen && (
        <ModalPortal open={authOpen} onClose={() => setAuthOpen(false)}>
          <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/70 p-4 sm:items-center">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 customer-animate-in">
              <h2 className="text-lg font-semibold">Verify to unlock nearby offers</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Enter the phone number on your account and your email. We will send a one-time code —
                no password needed.
              </p>
              <div className="mt-4 space-y-3">
                <CustomerInput
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
                <CustomerInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                />
                {otpSent && (
                  <CustomerInput
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                  />
                )}
                {authError && <p className="text-sm text-red-400">{authError}</p>}
              </div>
              <div className="mt-6 flex gap-2">
                <CustomerButton
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setAuthOpen(false)}
                  disabled={authLoading}
                >
                  Later
                </CustomerButton>
                {!otpSent ? (
                  <CustomerButton
                    className="flex-1"
                    onClick={requestOtp}
                    isLoading={authLoading}
                    disabled={!phone.trim() || !email.trim()}
                  >
                    Send code
                  </CustomerButton>
                ) : (
                  <CustomerButton
                    className="flex-1"
                    onClick={verifyOtp}
                    isLoading={authLoading}
                    disabled={otp.trim().length !== 6}
                  >
                    Verify
                  </CustomerButton>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {locationError && !authOpen && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
          {locationError}
        </div>
      )}

      {bait && (
        <ModalPortal open={Boolean(bait)} onClose={dismissBait}>
          <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 customer-animate-in">
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissBait}
                className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mb-3 flex items-center gap-2 text-[var(--primary)]">
                <MapPin className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {bait.urgency_label}
                </span>
              </div>
              <p className="text-base leading-relaxed">{bait.message}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                About {bait.distance_km} km away · bait only — checkout uses active time-based offers
              </p>
              <div className="mt-6 flex gap-2">
                <CustomerButton variant="ghost" className="flex-1" onClick={dismissBait}>
                  Not now
                </CustomerButton>
                <CustomerRouteLink href="/menu" className="flex-1" onClick={dismissBait}>
                  <CustomerButton className="w-full">View menu</CustomerButton>
                </CustomerRouteLink>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
