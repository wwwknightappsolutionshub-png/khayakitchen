"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import {
  type BeforeInstallPromptEvent,
  bindPwaInstallPromptCapture,
  clearDeferredInstallPrompt,
  detectPwaInstalled,
  getDeferredInstallPrompt,
  isIosDevice,
  isStandaloneDisplay,
  markPwaInstalled,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

const DELAY_MS = 5_000;
const DISMISS_KEY = "khayaos-marketing-pwa-dismissed";

/** Full-screen install prompt after 5s on the marketing get-started page. */
export function MarketingPwaInstallGate() {
  const { theme } = useMarketingTheme();
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bindPwaInstallPromptCapture();
    const unsub = subscribeInstallPrompt(setDeferred);
    return unsub;
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    void (async () => {
      if (typeof window === "undefined") return;
      if (isStandaloneDisplay() || (await detectPwaInstalled("ops"))) return;
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

      timer = window.setTimeout(() => {
        if (cancelled) return;
        const prompt = getDeferredInstallPrompt();
        if (prompt) {
          setDeferred(prompt);
          setIos(false);
          setOpen(true);
          return;
        }
        if (isIosDevice()) {
          setIos(true);
          setOpen(true);
          return;
        }
        // Desktop / unsupported: still show install guidance for Add to Home Screen / browser install.
        setIos(false);
        setOpen(true);
      }, DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    const prompt = deferred ?? getDeferredInstallPrompt();
    if (!prompt) {
      dismiss();
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        markPwaInstalled("ops");
        clearDeferredInstallPrompt();
        setOpen(false);
      } else {
        dismiss();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full max-w-md rounded-3xl border p-6 shadow-2xl",
          theme.surfaceBorder,
          theme.surface,
        )}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className={cn("absolute right-4 top-4 rounded-full p-1", theme.iconButton)}
        >
          <X className="h-5 w-5" />
        </button>
        <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl", theme.iconBox)}>
          <Download className="h-6 w-6" />
        </div>
        <h2 className={cn("text-xl font-semibold", theme.heading)}>Install KhayaOS Ops</h2>
        <p className={cn("mt-2 text-sm leading-relaxed", theme.muted)}>
          Add KhayaOS Ops to your home screen for one-tap access to your kitchen workspace — faster
          than the browser tab.
        </p>
        {ios ? (
          <ol className={cn("mt-4 list-decimal space-y-2 pl-5 text-sm", theme.body)}>
            <li>Tap the Share button in Safari</li>
            <li>Choose Add to Home Screen</li>
            <li>Confirm Install</li>
          </ol>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          {!ios && deferred ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void install()}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white",
                theme.primaryButton,
              )}
            >
              {busy ? "Opening…" : "Install now"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold",
              theme.secondaryButton,
            )}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
