import { engagementService } from "@/services/engagement.service";
import { realtimeService } from "@/services/realtime.service";
import { registerNetworkOnlyServiceWorker } from "@/lib/pwa";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallPromptListener = (event: BeforeInstallPromptEvent | null) => void;

const PWA_INSTALLED_KEY = "khayaos_pwa_installed";

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let captureBound = false;
const installPromptListeners = new Set<InstallPromptListener>();

function notifyInstallPromptListeners(): void {
  for (const listener of installPromptListeners) {
    listener(deferredInstallPrompt);
  }
}

export function markPwaInstalled(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PWA_INSTALLED_KEY, "1");
}

export function clearPwaInstalledMark(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PWA_INSTALLED_KEY);
}

/** Capture beforeinstallprompt as early as possible (once per page load). */
export function bindPwaInstallPromptCapture(): void {
  if (typeof window === "undefined" || captureBound) return;
  captureBound = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    notifyInstallPromptListeners();
  });

  window.addEventListener("appinstalled", () => {
    markPwaInstalled();
    deferredInstallPrompt = null;
    notifyInstallPromptListeners();
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export function subscribeInstallPrompt(
  listener: InstallPromptListener,
): () => void {
  installPromptListeners.add(listener);
  listener(deferredInstallPrompt);
  return () => {
    installPromptListeners.delete(listener);
  };
}

export function clearDeferredInstallPrompt(): void {
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const minimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standalone || fullscreen || minimalUi || iosStandalone;
}

/** True when running as installed app, or when install was completed on this device. */
export async function detectPwaInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay()) {
    markPwaInstalled();
    return true;
  }
  if (localStorage.getItem(PWA_INSTALLED_KEY) === "1") {
    return true;
  }

  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps === "function") {
    try {
      const related = await nav.getInstalledRelatedApps();
      if (related.length > 0) {
        markPwaInstalled();
        return true;
      }
    } catch {
      // Unsupported or blocked — fall through.
    }
  }

  return false;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/i.test(window.navigator.userAgent);
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function notificationBlockedHelp(): string {
  if (isIosDevice()) {
    return "Notifications are blocked. On iPhone: Settings → Notifications → find KhayaOS or Safari → Allow Notifications.";
  }
  if (isAndroidDevice()) {
    return "Notifications are blocked. On Android: Settings → Apps → Chrome (or KhayaOS) → Notifications → Allow, then try again.";
  }
  return "Notifications are blocked in this browser. Allow notifications for this site in browser settings, then try again.";
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Subscribe to web push and register the token for the authenticated staff user. */
export async function registerStaffWebPush(options?: {
  requestPermission?: boolean;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;

  const requestPermission = options?.requestPermission ?? true;
  let permission = Notification.permission;
  if (permission === "default" && requestPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return false;

  const reg =
    (await navigator.serviceWorker.ready.catch(() => null)) ??
    (await registerNetworkOnlyServiceWorker());
  if (!reg) return false;

  const publicConfig = await realtimeService.getPublicConfig().catch(() => null);
  const vapidKey = publicConfig?.vapid_public_key;
  const applicationServerKey = vapidKey
    ? (urlBase64ToUint8Array(vapidKey) as BufferSource)
    : undefined;

  const existing = await reg.pushManager.getSubscription().catch(() => null);
  const subscription =
    existing ??
    (await reg.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      .catch(() => null));

  if (!subscription) return false;

  await engagementService.registerStaffDeviceToken(JSON.stringify(subscription.toJSON()));
  return true;
}

/** Refresh staff push token when permission was already granted (no prompt). */
export async function refreshStaffWebPushIfGranted(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  return registerStaffWebPush({ requestPermission: false });
}
