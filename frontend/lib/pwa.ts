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
  // Drop prior cache-bust params so the URL stays usable.
  url.searchParams.delete("_v");
  url.searchParams.set("_v", String(Date.now()));
  return url.toString();
}

/** Wipe SW + Cache Storage, then navigate (defaults to current path for login recovery). */
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

/**
 * Register network-only SW required for installability and push.
 *
 * Phase B: Ops uses `/ops/sw.js` (scope `/ops/`). Customer uses `/sw.js` (scope `/`).
 * When both are registered, the more-specific `/ops/` scope controls Ops URLs.
 * On Ops routes we force an update so the Ops worker activates promptly.
 *
 * Residual: customer `scope: "/"` can still observe `/ops/*` until Ops SW claims
 * those clients — network-only fetch means no stale shells; push chrome may still
 * follow whichever registration delivers the event. Installed Ops chrome is
 * browser-limited by manifest `scope: "/ops/"`.
 */
export async function registerNetworkOnlyServiceWorker(
  surface: "customer" | "ops" = "customer",
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    if (surface === "ops") {
      const reg = await navigator.serviceWorker.register("/ops/sw.js", {
        scope: "/ops/",
        updateViaCache: "none",
      });
      await reg.update().catch(() => undefined);
      return reg;
    }

    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await reg.update().catch(() => undefined);
    return reg;
  } catch {
    return null;
  }
}

/** Kept for hard-reset flows that must clear registrations. */
export async function disableServiceWorkers(): Promise<void> {
  await unregisterServiceWorkers();
}
