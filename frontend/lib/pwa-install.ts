import { engagementService } from "@/services/engagement.service";
import { customerNotificationsService } from "@/services/customer-notifications.service";
import { realtimeService } from "@/services/realtime.service";
import { registerNetworkOnlyServiceWorker } from "@/lib/pwa";
import { isOpsPath } from "@/lib/ops-paths";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type PwaSurface = "customer" | "ops";

type InstallPromptListener = (event: BeforeInstallPromptEvent | null) => void;
type InstallUiListener = (open: boolean) => void;

/** @deprecated Prefer surface-specific keys via markPwaInstalled(surface). */
export const LEGACY_PWA_INSTALLED_KEY = "khayaos_pwa_installed";
export const CUSTOMER_PWA_INSTALLED_KEY = "khayaos_customer_pwa_installed";
export const OPS_PWA_INSTALLED_KEY = "khayaos_ops_pwa_installed";

export const PWA_INSTALL_UI_EVENT = "khayaos-pwa-install-ui";
/** Ask PwaInstallPrompt to open (toast CTA / claim flow). */
export const PWA_INSTALL_REQUEST_EVENT = "khayaos-pwa-install-request";
export const INSTALL_CLAIM_TOAST_KEY = "khayaos-install-claim-toast";

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let captureBound = false;
let pwaInstallUiOpen = false;
const installPromptListeners = new Set<InstallPromptListener>();
const installUiListeners = new Set<InstallUiListener>();

function notifyInstallPromptListeners(): void {
  for (const listener of installPromptListeners) {
    listener(deferredInstallPrompt);
  }
}

function installedKeyFor(surface: PwaSurface): string {
  return surface === "ops" ? OPS_PWA_INSTALLED_KEY : CUSTOMER_PWA_INSTALLED_KEY;
}

/** Infer which PWA surface the current path belongs to. */
export function inferPwaSurface(pathname?: string): PwaSurface {
  if (typeof window === "undefined" && !pathname) return "customer";
  const path = pathname ?? window.location.pathname;
  return isOpsPath(path) ? "ops" : "customer";
}

function migrateLegacyInstallMark(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LEGACY_PWA_INSTALLED_KEY) !== "1") return;
  // Credit only the surface for the current path so the other app can still be installed.
  const surface = inferPwaSurface();
  localStorage.setItem(installedKeyFor(surface), "1");
  localStorage.removeItem(LEGACY_PWA_INSTALLED_KEY);
}

export function markPwaInstalled(surface: PwaSurface = inferPwaSurface()): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(installedKeyFor(surface), "1");
  localStorage.removeItem(LEGACY_PWA_INSTALLED_KEY);
}

export function clearPwaInstalledMark(surface?: PwaSurface): void {
  if (typeof window === "undefined") return;
  if (surface) {
    localStorage.removeItem(installedKeyFor(surface));
    return;
  }
  localStorage.removeItem(CUSTOMER_PWA_INSTALLED_KEY);
  localStorage.removeItem(OPS_PWA_INSTALLED_KEY);
  localStorage.removeItem(LEGACY_PWA_INSTALLED_KEY);
}

/** Capture beforeinstallprompt as early as possible (once per page load). */
export function bindPwaInstallPromptCapture(): void {
  if (typeof window === "undefined" || captureBound) return;
  captureBound = true;
  migrateLegacyInstallMark();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    notifyInstallPromptListeners();
  });

  window.addEventListener("appinstalled", () => {
    const surface = inferPwaSurface();
    markPwaInstalled(surface);
    deferredInstallPrompt = null;
    notifyInstallPromptListeners();
    if (surface === "customer") {
      void tryClaimPwaInstallReward();
    }
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

/** True while the customer PWA install modal is visible (blocks Stay-in-the-loop). */
export function isPwaInstallUiOpen(): boolean {
  return pwaInstallUiOpen;
}

export function setPwaInstallUiOpen(open: boolean): void {
  if (pwaInstallUiOpen === open) return;
  pwaInstallUiOpen = open;
  for (const listener of installUiListeners) {
    listener(open);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PWA_INSTALL_UI_EVENT, { detail: { open } }),
    );
  }
}

export function subscribePwaInstallUi(listener: InstallUiListener): () => void {
  installUiListeners.add(listener);
  listener(pwaInstallUiOpen);
  return () => {
    installUiListeners.delete(listener);
  };
}

/** Open the existing PWA install modal (Android prompt or iOS instructions). */
export function requestPwaInstallUi(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_INSTALL_REQUEST_EVENT));
}

export interface InstallClaimToastPayload {
  customerId: string;
  phone: string;
  points: number;
  email?: string;
}

export function stashInstallClaimToast(payload: InstallClaimToastPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INSTALL_CLAIM_TOAST_KEY, JSON.stringify(payload));
}

export function consumeInstallClaimToast(): InstallClaimToastPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(INSTALL_CLAIM_TOAST_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(INSTALL_CLAIM_TOAST_KEY);
  try {
    return JSON.parse(raw) as InstallClaimToastPayload;
  } catch {
    return null;
  }
}

/**
 * Report install to backend and claim one-time loyalty tokens when customer id is known.
 * Safe to call repeatedly — server is idempotent.
 */
export async function tryClaimPwaInstallReward(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const customerId = localStorage.getItem("khayaos-customer-id");
  const phone = localStorage.getItem("khayaos-customer-phone");
  if (!customerId || !phone) return false;

  const email = localStorage.getItem("khayaos-customer-email") ?? undefined;
  markPwaInstalled("customer");

  try {
    const { loyaltyService } = await import("@/services/loyalty.service");
    await loyaltyService.claimInstall(customerId, phone, email || undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * After install: request notification permission, subscribe when granted.
 * Registers the device token when a guest customer id is already known.
 */
export async function requestGuestWebPushAfterInstall(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "denied";
  }

  const reg =
    (await navigator.serviceWorker.ready.catch(() => null)) ??
    (await registerNetworkOnlyServiceWorker("customer"));
  if (!reg) return "granted";

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

  if (!subscription) return "granted";

  const customerId = localStorage.getItem("khayaos-customer-id");
  if (customerId) {
    await customerNotificationsService
      .registerDeviceToken(customerId, JSON.stringify(subscription.toJSON()))
      .catch(() => undefined);
  }

  return "granted";
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

/** True when running as installed app for this surface, or install completed on this device. */
export async function detectPwaInstalled(
  surface: PwaSurface = inferPwaSurface(),
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  migrateLegacyInstallMark();

  if (isStandaloneDisplay()) {
    const current = inferPwaSurface();
    markPwaInstalled(current);
    return current === surface || localStorage.getItem(installedKeyFor(surface)) === "1";
  }

  if (localStorage.getItem(installedKeyFor(surface)) === "1") {
    return true;
  }

  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps === "function") {
    try {
      const related = await nav.getInstalledRelatedApps();
      const needle = surface === "ops" ? "manifest-ops" : "pwa-manifest";
      const match = related.some((app) => (app.url ?? "").includes(needle));
      if (match) {
        markPwaInstalled(surface);
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

export function notificationBlockedHelp(surface: PwaSurface = inferPwaSurface()): string {
  const appLabel = surface === "ops" ? "KhayaOS Ops" : "this kitchen app";
  if (isIosDevice()) {
    return `Notifications are blocked. On iPhone: Settings → Notifications → find ${appLabel} or Safari → Allow Notifications.`;
  }
  if (isAndroidDevice()) {
    return `Notifications are blocked. On Android: Settings → Apps → Chrome (or ${appLabel}) → Notifications → Allow, then try again.`;
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
    (await registerNetworkOnlyServiceWorker("ops"));
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
