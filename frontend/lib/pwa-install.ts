import { engagementService } from "@/services/engagement.service";
import { realtimeService } from "@/services/realtime.service";
import { registerNetworkOnlyServiceWorker } from "@/lib/pwa";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
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
