"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModalFrame } from "@/components/ui/ModalFrame";
import {
  type BeforeInstallPromptEvent,
  clearDeferredInstallPrompt,
  isAndroidDevice,
  isIosDevice,
  isStandaloneDisplay,
  registerStaffWebPush,
  refreshStaffWebPushIfGranted,
  subscribeInstallPrompt,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

interface AdminPwaInstallNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function AdminPwaInstallNav({ onNavigate, className }: AdminPwaInstallNavProps) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushDone, setPushDone] = useState(false);
  const [installOutcome, setInstallOutcome] = useState<string | null>(null);

  useEffect(() => {
    const syncInstalled = () => {
      const standalone = isStandaloneDisplay();
      setInstalled(standalone);
      setReady(true);
    };

    syncInstalled();
    void refreshStaffWebPushIfGranted();

    const unsubscribe = subscribeInstallPrompt((event) => {
      setDeferredPrompt(event);
    });

    const media = window.matchMedia("(display-mode: standalone)");
    const onMedia = () => syncInstalled();
    media.addEventListener("change", onMedia);
    window.addEventListener("appinstalled", syncInstalled);

    return () => {
      unsubscribe();
      media.removeEventListener("change", onMedia);
      window.removeEventListener("appinstalled", syncInstalled);
    };
  }, []);

  const openModal = () => {
    setError(null);
    setPushDone(false);
    setInstallOutcome(null);
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
    try {
      const ok = await registerStaffWebPush({ requestPermission: true });
      if (!ok) {
        setError("Notification permission is required for platform push alerts.");
        return false;
      }
      setPushDone(true);
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
    setInstallOutcome(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        setInstallOutcome("Install started. Open KhayaOS from your home screen when ready.");
        setInstalled(isStandaloneDisplay());
        await registerStaffWebPush({ requestPermission: true });
        setPushDone(true);
      } else {
        setInstallOutcome("Install was dismissed. You can try again anytime.");
      }
    } catch {
      setError("Install was cancelled or failed. You can try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready || installed) return null;

  const ios = isIosDevice();
  const android = isAndroidDevice();
  const canNativeInstall = !!deferredPrompt && !ios;

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
        <Download className="h-4 w-4 shrink-0" />
        Install app
      </button>

      <ModalFrame open={open} onClose={closeModal}>
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Install KhayaOS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Install the admin app for faster access and platform push alerts on this device.
            </p>

            {canNativeInstall ? (
              <p className="text-sm text-foreground">
                Tap <span className="font-semibold">Install</span> to add KhayaOS to your home screen.
              </p>
            ) : ios ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>Tap the Share button in Safari</li>
                <li>Choose Add to Home Screen</li>
                <li>Confirm Add, then open the installed app</li>
                <li>Return here and tap Enable notifications</li>
              </ol>
            ) : android ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>Tap the Chrome menu (⋮) in the top-right</li>
                <li>Choose Install app or Add to Home screen</li>
                <li>Confirm Install, then open KhayaOS from your home screen</li>
                <li>Tap Enable notifications below to receive platform push</li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>Open your browser menu</li>
                <li>Choose Install app or Add to Home screen</li>
                <li>Open the installed app, then enable notifications below</li>
              </ol>
            )}

            {error ? (
              <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {installOutcome ? <p className="text-sm text-secondary">{installOutcome}</p> : null}
            {pushDone ? (
              <p className="text-sm text-secondary">This device is registered for push alerts.</p>
            ) : null}

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
