"use client";

import { useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { customerNotificationsService } from "@/services/customer-notifications.service";
import { realtimeService } from "@/services/realtime.service";
import { SPLASH_COMPLETE_EVENT } from "@/lib/splash-events";
import {
  isPwaInstallUiOpen,
  subscribePwaInstallUi,
  urlBase64ToUint8Array,
} from "@/lib/pwa-install";

const STORAGE_KEY = "khayaos-opt-in-dismissed";
/** Significant delay so Stay-in-the-loop never races the PWA install flow. */
const PROMPT_DELAY_MS = 240_000;

export function NotificationOptInPrompt() {
  const [open, setOpen] = useState(false);
  const scheduledRef = useRef(false);
  const delayElapsedRef = useRef(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const tryOpen = () => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (!delayElapsedRef.current) return;
    if (isPwaInstallUiOpen()) return;
    setOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    let timer: number | undefined;

    const onDelayElapsed = () => {
      delayElapsedRef.current = true;
      tryOpen();
    };

    const schedulePrompt = () => {
      if (scheduledRef.current) return;
      scheduledRef.current = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(onDelayElapsed, PROMPT_DELAY_MS);
    };

    window.addEventListener(SPLASH_COMPLETE_EVENT, schedulePrompt);
    // Fallback if splash never fires (e.g. already seen).
    timer = window.setTimeout(schedulePrompt, PROMPT_DELAY_MS + 500);

    const unsubscribeInstallUi = subscribePwaInstallUi((installOpen) => {
      if (!installOpen) {
        tryOpen();
      }
    });

    return () => {
      window.removeEventListener(SPLASH_COMPLETE_EVENT, schedulePrompt);
      window.clearTimeout(timer);
      unsubscribeInstallUi();
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const save = async () => {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      const result = await customerNotificationsService.upsertPreferences({
        phone: phone.trim(),
        push_enabled: pushEnabled,
        whatsapp_enabled: whatsappEnabled,
      });

      localStorage.setItem("khayaos-customer-id", result.customer_id);

      if (pushEnabled && "Notification" in window && "serviceWorker" in navigator) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const reg = await navigator.serviceWorker.ready;
          const publicConfig = await realtimeService.getPublicConfig();
          const vapidKey = publicConfig.vapid_public_key;
          const applicationServerKey = vapidKey
            ? (urlBase64ToUint8Array(vapidKey) as BufferSource)
            : undefined;

          const subscription = await reg.pushManager
            .subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            })
            .catch(() => null);

          if (subscription) {
            await customerNotificationsService.registerDeviceToken(
              result.customer_id,
              JSON.stringify(subscription.toJSON()),
            );
          }
        }
      }

      localStorage.setItem(STORAGE_KEY, "1");
      setOpen(false);
    } catch {
      // Allow retry on next visit
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalPortal open onClose={dismiss}>
      <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
        <button type="button" className="absolute inset-0 bg-black/70" onClick={dismiss} aria-label="Close" />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 customer-animate-in">
          <h2 className="text-xl font-semibold">Stay in the loop</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Get updates on your orders and exclusive offers?
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Push notifications alert you when your order is accepted, being prepared, and ready.
            You can change this anytime.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44..."
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-sm"
            />
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Allow Push Notifications
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="accent-[var(--secondary)]"
              />
              Allow WhatsApp Updates
            </label>
          </div>

          <div className="mt-6 flex gap-2">
            <CustomerButton variant="ghost" className="flex-1" onClick={dismiss}>
              Not now
            </CustomerButton>
            <CustomerButton
              className="flex-1"
              onClick={save}
              isLoading={saving}
              disabled={!phone.trim() || (!pushEnabled && !whatsappEnabled)}
            >
              Save
            </CustomerButton>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
