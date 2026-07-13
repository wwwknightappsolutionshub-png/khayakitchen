"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModalFrame } from "@/components/ui/ModalFrame";
import {
  type BeforeInstallPromptEvent,
  isIosDevice,
  isStandaloneDisplay,
  registerStaffWebPush,
  refreshStaffWebPushIfGranted,
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
  const [iosMode, setIosMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushDone, setPushDone] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const syncInstalled = () => {
      const standalone = isStandaloneDisplay();
      setInstalled(standalone);
      setReady(true);
    };

    syncInstalled();
    void refreshStaffWebPushIfGranted();

    const media = window.matchMedia("(display-mode: standalone)");
    const onMedia = () => syncInstalled();
    media.addEventListener("change", onMedia);
    window.addEventListener("appinstalled", syncInstalled);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("appinstalled", syncInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const openModal = () => {
    setError(null);
    setPushDone(false);
    setIosMode(isIosDevice() && !deferredPromptRef.current);
    setDeferredPrompt(deferredPromptRef.current);
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
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      await enableNotifications();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
      setInstalled(isStandaloneDisplay());
      await registerStaffWebPush({ requestPermission: true });
      setPushDone(true);
      setOpen(false);
    } catch {
      setError("Install was cancelled or failed. You can try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready || installed) return null;

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
              Install the admin app for faster access and to receive platform push alerts on this
              device. You can also enable notifications without installing.
            </p>

            {iosMode ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                <li>Tap the Share button in Safari</li>
                <li>Choose Add to Home Screen</li>
                <li>Open the installed app, then tap Enable notifications below</li>
              </ol>
            ) : null}

            {error ? (
              <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
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
              {!iosMode && deferredPrompt ? (
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
