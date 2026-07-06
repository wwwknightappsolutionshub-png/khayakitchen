import {
  APP_BUILD_STORAGE_KEY,
  BOOT_RELOAD_KEY,
  PWA_CACHE_EPOCH,
  PWA_CACHE_EPOCH_KEY,
  RESET_COUNT_KEY,
} from "@/lib/pwa-boot-gate";

/** Static file first — survives nginx /api routing; route handler is dev fallback. */
const VERSION_URLS = ["/app-version.json", "/app-version"] as const;

export { APP_BUILD_STORAGE_KEY };

export async function clearPwaCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export async function unregisterServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

function buildRedirectUrl(path = "/"): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("_v", String(Date.now()));
  return url.toString();
}

/** Wipe SW + Cache Storage, then navigate to home (never reload /reset-app). */
export async function hardResetPwa(nextBuildId?: string, redirectTo = "/"): Promise<void> {
  const serverBuild = nextBuildId ?? (await fetchServerBuildId());
  if (serverBuild) {
    localStorage.setItem(APP_BUILD_STORAGE_KEY, serverBuild);
  }
  localStorage.setItem(PWA_CACHE_EPOCH_KEY, PWA_CACHE_EPOCH);
  sessionStorage.setItem(BOOT_RELOAD_KEY, "1");
  sessionStorage.removeItem(RESET_COUNT_KEY);

  await unregisterServiceWorkers();
  await clearPwaCaches();

  window.location.replace(buildRedirectUrl(redirectTo));
}

export async function fetchServerBuildId(): Promise<string | null> {
  for (const url of VERSION_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const payload = (await response.json()) as { build?: string };
      if (payload.build) return payload.build;
    } catch {
      // try next source
    }
  }

  return null;
}

/** Pilot: keep service workers unregistered so stale bundles cannot persist. */
export async function disableServiceWorkers(): Promise<void> {
  await unregisterServiceWorkers();
}
