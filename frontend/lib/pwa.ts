import {
  APP_BUILD_STORAGE_KEY,
  BOOT_RELOAD_KEY,
  PWA_CACHE_EPOCH,
  PWA_CACHE_EPOCH_KEY,
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

/** Wipe SW + Cache Storage and reload. Optionally pin the next build id before reload. */
export async function hardResetPwa(nextBuildId?: string): Promise<void> {
  if (nextBuildId) {
    localStorage.setItem(APP_BUILD_STORAGE_KEY, nextBuildId);
  }
  localStorage.setItem(PWA_CACHE_EPOCH_KEY, PWA_CACHE_EPOCH);
  sessionStorage.setItem(BOOT_RELOAD_KEY, "1");

  await unregisterServiceWorkers();
  await clearPwaCaches();

  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(Date.now()));
  window.location.replace(url.toString());
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

/**
 * Compare stored build id with the server. On mismatch, hard-reset so clients
 * cannot keep serving stale HTML/CSS from SW or Cache Storage.
 */
export async function runVersionGate(): Promise<boolean> {
  const serverBuild = await fetchServerBuildId();
  if (!serverBuild) return false;

  const pageBuild = document.documentElement.dataset.build;
  const storedBuild = localStorage.getItem(APP_BUILD_STORAGE_KEY);
  const storedEpoch = localStorage.getItem(PWA_CACHE_EPOCH_KEY);

  const stalePage = Boolean(pageBuild && pageBuild !== serverBuild);
  const staleStorage = Boolean(storedBuild && storedBuild !== serverBuild);
  const staleEpoch = storedEpoch !== PWA_CACHE_EPOCH;

  if (stalePage || staleStorage || staleEpoch) {
    await hardResetPwa(serverBuild);
    return true;
  }

  localStorage.setItem(APP_BUILD_STORAGE_KEY, serverBuild);
  localStorage.setItem(PWA_CACHE_EPOCH_KEY, PWA_CACHE_EPOCH);
  return false;
}

/** Pilot: keep service workers unregistered so stale bundles cannot persist. */
export async function disableServiceWorkers(): Promise<void> {
  await unregisterServiceWorkers();
  await clearPwaCaches();
}
