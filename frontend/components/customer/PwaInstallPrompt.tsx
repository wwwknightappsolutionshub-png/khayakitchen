"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useStorefront } from "@/hooks/useStorefront";
import { SPLASH_COMPLETE_EVENT } from "@/lib/splash-events";
import {
  type BeforeInstallPromptEvent,
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  isIosDevice,
  isStandaloneDisplay,
  requestGuestWebPushAfterInstall,
  setPwaInstallUiOpen,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";

const PROMPT_DELAY_MS = 8_000;
const REPROMPT_DELAY_MS = 60_000;

export function PwaInstallPrompt() {
  const { data } = useStorefront();
  const slug = data?.workspace?.slug ?? "";
  const restaurantName =
    data?.branding?.restaurant_name || data?.workspace?.name || "this restaurant";
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosMode, setIosMode] = useState(false);
  const [installing, setInstalling] = useState(false);
  const readyToPromptRef = useRef(false);
  const scheduledInitialRef = useRef(false);
  const openRef = useRef(false);
  const repromptTimerRef = useRef<number | undefined>(undefined);

  const canShow = () => {
    if (!slug) return false;
    if (isStandaloneDisplay()) return false;
    return true;
  };

  const closeUi = () => {
    openRef.current = false;
    setOpen(false);
    setPwaInstallUiOpen(false);
  };

  const openInstallUi = (promptEvent: BeforeInstallPromptEvent | null, asIos: boolean) => {
    if (!canShow() || openRef.current) return;
    openRef.current = true;
    setDeferredPrompt(promptEvent);
    setIosMode(asIos);
    setOpen(true);
    setPwaInstallUiOpen(true);
  };

  const scheduleReprompt = () => {
    if (typeof window === "undefined") return;
    window.clearTimeout(repromptTimerRef.current);
    repromptTimerRef.current = window.setTimeout(() => {
      if (!canShow() || openRef.current) return;
      const promptEvent = getDeferredInstallPrompt();
      if (promptEvent) {
        openInstallUi(promptEvent, false);
        return;
      }
      if (isIosDevice()) {
        openInstallUi(null, true);
      }
    }, REPROMPT_DELAY_MS);
  };

  useEffect(() => {
    return subscribeInstallPrompt((event) => {
      setDeferredPrompt(event);
      if (readyToPromptRef.current && event && !openRef.current && canShow()) {
        openInstallUi(event, false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!slug) return;
    if (!canShow()) return;

    let timer: number | undefined;

    const markReadyAndMaybeOpen = () => {
      readyToPromptRef.current = true;
      if (!canShow() || openRef.current) return;

      const promptEvent = getDeferredInstallPrompt();
      if (promptEvent) {
        openInstallUi(promptEvent, false);
        return;
      }

      if (isIosDevice()) {
        openInstallUi(null, true);
      }
    };

    const schedulePrompt = () => {
      if (scheduledInitialRef.current) return;
      scheduledInitialRef.current = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(markReadyAndMaybeOpen, PROMPT_DELAY_MS);
    };

    window.addEventListener(SPLASH_COMPLETE_EVENT, schedulePrompt);
    timer = window.setTimeout(schedulePrompt, PROMPT_DELAY_MS + 500);

    return () => {
      window.removeEventListener(SPLASH_COMPLETE_EVENT, schedulePrompt);
      window.clearTimeout(timer);
      window.clearTimeout(repromptTimerRef.current);
      setPwaInstallUiOpen(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const dismiss = () => {
    closeUi();
    // Soft dismiss — re-prompt after 60s; also shows again on refresh/next visit.
    scheduleReprompt();
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        // Install started — request notifications next, then close immediately.
        await requestGuestWebPushAfterInstall();
        closeUi();
        window.clearTimeout(repromptTimerRef.current);
        return;
      }

      // Dismissed native install sheet — soft re-prompt later.
      closeUi();
      scheduleReprompt();
    } catch {
      // Keep prompt available for retry
    } finally {
      setInstalling(false);
    }
  };

  if (!open || !slug) return null;

  return (
    <ModalPortal open onClose={dismiss}>
      <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/70"
          onClick={dismiss}
          aria-label="Close"
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 customer-animate-in">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
            <Download className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">Install {restaurantName}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Install this app for faster access, a full-screen ordering experience, and quicker
            reordering next time.
          </p>

          {iosMode ? (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--foreground)]">
              <li>Tap the Share button in Safari</li>
              <li>Choose Add to Home Screen</li>
              <li>Confirm Add to install {restaurantName}</li>
            </ol>
          ) : (
            <p className="mt-3 text-xs text-[var(--muted)]">
              You can open it from your home screen like a normal app after installing.
            </p>
          )}

          <div className="mt-6 flex gap-2">
            <CustomerButton variant="ghost" className="flex-1" onClick={dismiss}>
              Not now
            </CustomerButton>
            {!iosMode && deferredPrompt ? (
              <CustomerButton
                className="flex-1"
                onClick={() => void install()}
                isLoading={installing}
              >
                Install
              </CustomerButton>
            ) : (
              <CustomerButton className="flex-1" onClick={dismiss}>
                Got it
              </CustomerButton>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
