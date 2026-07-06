"use client";

import { useEffect, useRef } from "react";
import {
  clearPwaCaches,
  fetchServerBuildId,
  unregisterServiceWorkers,
} from "@/lib/pwa";
import {
  APP_BUILD_STORAGE_KEY,
  BOOT_RELOAD_KEY,
  PWA_CACHE_EPOCH,
  PWA_CACHE_EPOCH_KEY,
  RESET_COUNT_KEY,
} from "@/lib/pwa-boot-gate";

export default function ResetAppPage() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const serverBuild = await fetchServerBuildId();
      if (serverBuild) {
        localStorage.setItem(APP_BUILD_STORAGE_KEY, serverBuild);
      }
      localStorage.setItem(PWA_CACHE_EPOCH_KEY, PWA_CACHE_EPOCH);
      sessionStorage.setItem(BOOT_RELOAD_KEY, "1");
      sessionStorage.removeItem(RESET_COUNT_KEY);

      await unregisterServiceWorkers();
      await clearPwaCaches();

      const url = new URL("/", window.location.origin);
      url.searchParams.set("_v", String(Date.now()));
      window.location.replace(url.toString());
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F10] px-6 text-center text-white">
      <div>
        <p className="text-lg font-semibold">Updating Khaya Kitchen…</p>
        <p className="mt-2 text-sm text-zinc-400">Clearing cached app data. Redirecting to home…</p>
      </div>
    </div>
  );
}
