"use client";

import { useEffect, useRef, useState } from "react";
import { PwaUpdateBanner } from "@/components/shared/PwaUpdateBanner";
import { checkForPwaUpdate, runVersionGate } from "@/lib/pwa";

export function PwaLifecycle() {
  const [updateReady, setUpdateReady] = useState(false);
  const reloadScheduled = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scheduleReload = () => {
      if (reloadScheduled.current) return;
      reloadScheduled.current = true;
      window.location.reload();
    };

    const onControllerChange = () => {
      scheduleReload();
    };

    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    const wireRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setUpdateReady(true);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    };

    const syncPwa = async () => {
      const resetTriggered = await runVersionGate();
      if (resetTriggered) return;

      const registration = await checkForPwaUpdate();
      if (registration) {
        wireRegistration(registration);
      }
    };

    void syncPwa();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncPwa();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (!updateReady) return null;

  return <PwaUpdateBanner onDismiss={() => setUpdateReady(false)} />;
}
