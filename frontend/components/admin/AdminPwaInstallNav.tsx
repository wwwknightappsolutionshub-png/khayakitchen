"use client";

import { useEffect, useState } from "react";
import { Bell, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModalFrame } from "@/components/ui/ModalFrame";
import {
  type BeforeInstallPromptEvent,
  clearDeferredInstallPrompt,
  detectPwaInstalled,
  isAndroidDevice,
  isIosDevice,
  markPwaInstalled,
  notificationBlockedHelp,
  notificationPermission,
  registerStaffWebPush,
  refreshStaffWebPushIfGranted,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

interface AdminPwaInstallNavProps {
  onNavigate?: () => void;
  className?: string;
}

type NavMode = "install" | "notify" | "hidden";

export function AdminPwaInstallNav({ onNavigate, className }: AdminPwaInstallNavProps) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<NavMode>("hidden");
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const resolveMode = async () => {
    const installed = await detectPwaInstalled();
    const permission = notificationPermission();

    if (installed) {
      if (permission === "granted") {
        void refreshStaffWebPushIfGranted();
        setMode("hidden");
      } else {
        setMode("notify");
      }
    } else {
      setMode("install");
    }
    setReady(true);
  };

  useEffect(() => {
    void resolveMode();

    const unsubscribe = subscribeInstallPrompt((event) => {
      setDeferredPrompt(event);
    });

    const mediaQueries = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: minimal-ui)"),
    ];
    const onMedia = () => {
      void resolveMode();
    };
    mediaQueries.forEach((mq) => mq.addEventListener("change", onMedia));
    window.addEventListener("appinstalled", onMedia);

    return () => {
      unsubscribe();
      mediaQueries.forEach((mq) => mq.removeEventListener("change", onMedia));
      window.removeEventListener("appinstalled", onMedia);
    };
  }, []);

  const openModal = () => {
    setError(null);
    setStatus(null);
    setOpen(true);
    onNavigate?.();
  };

  const closeModal = () => {
    setOpen(false);
    setBusy(false);
  };

  const enableNotifications = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (notificationPermission() === "denied") {
        setError(notificationBlockedHelp());
        return false;
      }

      const ok = await registerStaffWebPush({ requestPermission: true });
      if (!ok) {
        if (notificationPermission() === "denied") {
          setError(notificationBlockedHelp());
        } else {
          setError("Could not enable push alerts on this device. Try again after allowing notifications.");
        }
        return false;
      }
      setStatus("This device is registered for push alerts.");
      setMode("hidden");
      return true;
    } catch {
      setError("Could not register this device for push. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);

      if (choice.outcome !== "accepted") {
        setStatus("Install was dismissed. You can try again anytime.");
        return;
      }

      markPwaInstalled();
      setMode("notify");
      setStatus("App install started. Next, enable notifications so platform push can reach you.");

      try {
        const { presenceService } = await import("@/services/presence.service");
        await presenceService.claimStaffPwa();
      } catch {
        /* claim is best-effort; heartbeat will retry */
      }

      const pushOk = await registerStaffWebPush({ requestPermission: true });
      if (pushOk) {
        setStatus("Installed and registered for push alerts. You can close this.");
        setMode("hidden");
      } else if (notificationPermission() === "denied") {
        setError(notificationBlockedHelp());
      }
    } catch {
      setError("Install was cancelled or failed. You can try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready || mode === "hidden") return null;

  const ios = isIosDevice();
  const android = isAndroidDevice();
  const canNativeInstall = mode === "install" && !!deferredPrompt && !ios;
  const notifyOnly = mode === "notify";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
          "text-muted hover:bg-surface-elevated hover:text-foreground",
          className,
        )}
      >
        {notifyOnly ? <Bell className="h-4 w-4 shrink-0" /> : <Download className="h-4 w-4 shrink-0" />}
        {notifyOnly ? "Enable notifications" : "Install app"}
      </button>

      <ModalFrame open={open} onClose={closeModal}>
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {notifyOnly ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <Download className="h-5 w-5 text-primary" />
              )}
              {notifyOnly ? "Enable notifications" : "Install KhayaOS"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifyOnly ? (
              <>
                <p className="text-sm text-muted">
                  KhayaOS is already installed on this device. Enable notifications to receive
                  platform push alerts.
                </p>
                {android ? (
                  <p className="text-sm text-foreground">
                    Tap <span className="font-semibold">Enable notifications</span>, then choose
                    Allow when Android asks.
                  </p>
                ) : ios ? (
                  <p className="text-sm text-foreground">
                    Tap <span className="font-semibold">Enable notifications</span>, then choose
                    Allow. If nothing appears, check iPhone Settings → Notifications.
                  </p>
                ) : (
                  <p className="text-sm text-foreground">
                    Tap <span className="font-semibold">Enable notifications</span> and allow
                    browser permission when prompted.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Install the admin app for faster access, then enable notifications for platform
                  push alerts.
                </p>
                {canNativeInstall ? (
                  <p className="text-sm text-foreground">
                    Tap <span className="font-semibold">Install</span> to add KhayaOS to your home
                    screen.
                  </p>
                ) : ios ? (
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                    <li>Tap Share in Safari</li>
                    <li>Choose Add to Home Screen</li>
                    <li>Open KhayaOS from your home screen</li>
                    <li>Come back here and enable notifications</li>
                  </ol>
                ) : android ? (
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                    <li>Tap the Chrome menu (⋮)</li>
                    <li>Choose Install app or Add to Home screen</li>
                    <li>Open KhayaOS from your home screen</li>
                    <li>Tap Enable notifications when it appears</li>
                  </ol>
                ) : (
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                    <li>Open your browser menu</li>
                    <li>Choose Install app or Add to Home screen</li>
                    <li>Open the installed app, then enable notifications</li>
                  </ol>
                )}
              </>
            )}

            {error ? (
              <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {status && !error ? <p className="text-sm text-secondary">{status}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={closeModal}>
                Close
              </Button>
              <Button variant="secondary" isLoading={busy} onClick={() => void enableNotifications()}>
                Enable notifications
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
    </>
  );
}
