"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModalFrame } from "@/components/ui/ModalFrame";
import {
  type BeforeInstallPromptEvent,
  activeManifestMatchesSurface,
  clearDeferredInstallPrompt,
  detectPwaInstalled,
  getDeferredInstallPrompt,
  isAndroidDevice,
  isIosDevice,
  isStandaloneDisplay,
  markPwaInstalled,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

const FIRST_DELAY_MS = 60_000;
const REPEAT_DELAY_MS = 300_000;
const SESSION_STARTED_KEY = "khayaos-ops-pwa-nudge-t0";

const TENANT_ROLES = new Set(["owner", "manager", "kitchen", "staff"]);

export function OpsPwaInstallNudge() {
  const { user } = useAuth();
  const { data: workspaceData } = useWorkspace(!!user?.tenant_id);
  const kitchenName = workspaceData?.workspace?.name ?? "your kitchen";

  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const installedRef = useRef(false);
  const firstTimerRef = useRef<number | undefined>(undefined);
  const repeatTimerRef = useRef<number | undefined>(undefined);

  const eligible =
    !!user?.tenant_id && TENANT_ROLES.has(user.role) && !isStandaloneDisplay();

  const stopTimers = () => {
    window.clearTimeout(firstTimerRef.current);
    window.clearInterval(repeatTimerRef.current);
  };

  const showIfNeeded = useCallback(() => {
    if (installedRef.current || isStandaloneDisplay()) return;
    setError(null);
    setStatus(null);
    setDeferredPrompt(getDeferredInstallPrompt());
    setOpen(true);
  }, []);

  useEffect(() => {
    const unsub = subscribeInstallPrompt(setDeferredPrompt);
    return unsub;
  }, []);

  useEffect(() => {
    if (!eligible) return;

    let cancelled = false;

    const arm = async () => {
      const installed = await detectPwaInstalled("ops");
      if (cancelled) return;
      if (installed || isStandaloneDisplay()) {
        installedRef.current = true;
        return;
      }

      const now = Date.now();
      const stored = sessionStorage.getItem(SESSION_STARTED_KEY);
      const startedAt = stored ? Number(stored) : now;
      if (!stored || Number.isNaN(startedAt)) {
        sessionStorage.setItem(SESSION_STARTED_KEY, String(now));
      }
      const elapsed = Date.now() - (Number.isNaN(startedAt) ? now : startedAt);
      const untilFirst = Math.max(0, FIRST_DELAY_MS - elapsed);

      firstTimerRef.current = window.setTimeout(() => {
        if (cancelled || installedRef.current) return;
        showIfNeeded();
        repeatTimerRef.current = window.setInterval(() => {
          if (installedRef.current || isStandaloneDisplay()) {
            stopTimers();
            setOpen(false);
            return;
          }
          showIfNeeded();
        }, REPEAT_DELAY_MS);
      }, untilFirst);
    };

    void arm();

    return () => {
      cancelled = true;
      stopTimers();
    };
  }, [eligible, showIfNeeded]);

  const closeUntilNext = () => {
    setOpen(false);
    setBusy(false);
  };

  const markInstalledAndStop = () => {
    installedRef.current = true;
    markPwaInstalled("ops");
    stopTimers();
    sessionStorage.removeItem(SESSION_STARTED_KEY);
    setOpen(false);
  };

  const install = async () => {
    const prompt = deferredPrompt ?? getDeferredInstallPrompt();
    if (!prompt) return;
    if (!activeManifestMatchesSurface("ops")) {
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);
      setError("Stay on KhayaOS Ops in this browser, then try Install again.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);

      if (choice.outcome !== "accepted") {
        setStatus("Install was dismissed. We will remind you again shortly.");
        return;
      }

      markPwaInstalled("ops");
      try {
        const { presenceService } = await import("@/services/presence.service");
        await presenceService.claimStaffPwa();
      } catch {
        /* heartbeat will retry */
      }
      markInstalledAndStop();
    } catch {
      setError("Install was cancelled or failed. You can try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!eligible || !open) return null;

  const ios = isIosDevice();
  const android = isAndroidDevice();
  const canNativeInstall = !!deferredPrompt && !ios;

  return (
    <ModalFrame open={open} onClose={closeUntilNext}>
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Install KhayaOS Ops
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{kitchenName}</span> runs best from the
            KhayaOS Ops app on your home screen — not a Chrome or browser tab.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
            <li>One tap from the home screen mid-service.</li>
            <li>Full-screen kitchen workspace, like a native app.</li>
            <li>Push alerts when orders arrive or KhayaOS needs you.</li>
            <li>Works in Chrome, Safari, and other browsers.</li>
          </ul>
          {canNativeInstall ? (
            <p className="text-sm text-foreground">
              Tap <span className="font-semibold">Install</span> and allow it when your browser asks.
            </p>
          ) : ios ? (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
              <li>Tap Share in Safari</li>
              <li>Choose Add to Home Screen</li>
              <li>Open KhayaOS Ops from your home screen</li>
            </ol>
          ) : android ? (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
              <li>Tap the Chrome menu (⋮)</li>
              <li>Choose Install app or Add to Home screen</li>
              <li>Open KhayaOS Ops from your home screen</li>
            </ol>
          ) : (
            <p className="text-sm text-foreground">
              Use your browser menu → Install app / Add to Home screen, then open KhayaOS Ops from
              the icon.
            </p>
          )}
          {error ? (
            <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {status && !error ? <p className="text-sm text-secondary">{status}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={closeUntilNext}>
              Not now
            </Button>
            {canNativeInstall ? (
              <Button isLoading={busy} onClick={() => void install()}>
                Install
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </ModalFrame>
  );
}
