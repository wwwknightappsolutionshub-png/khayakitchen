export const APP_BUILD_STORAGE_KEY = "khayaos_app_build";

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

  await unregisterServiceWorkers();
  await clearPwaCaches();
  window.location.reload();
}

export async function fetchServerBuildId(): Promise<string | null> {
  try {
    const response = await fetch("/api/app-version", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { build?: string };
    return payload.build ?? null;
  } catch {
    return null;
  }
}

/**
 * Compare stored build id with the server. On mismatch, hard-reset so clients
 * cannot keep serving stale HTML/CSS from SW or Cache Storage.
 */
export async function runVersionGate(): Promise<boolean> {
  const serverBuild = await fetchServerBuildId();
  if (!serverBuild) return false;

  const storedBuild = localStorage.getItem(APP_BUILD_STORAGE_KEY);
  if (storedBuild && storedBuild !== serverBuild) {
    await hardResetPwa(serverBuild);
    return true;
  }

  localStorage.setItem(APP_BUILD_STORAGE_KEY, serverBuild);
  return false;
}

export async function checkForPwaUpdate(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await registration.update();

  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  return registration;
}
