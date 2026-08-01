"use client";

import { useEffect } from "react";
import { hardResetPwa } from "@/lib/pwa";
import { CHUNK_RELOAD_KEY } from "@/lib/pwa-boot-gate";

function isChunkLoadFailure(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") {
    const text = String(reason ?? "");
    return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to load chunk/i.test(text);
  }
  const err = reason as { name?: string; message?: string };
  const message = err.message ?? "";
  return (
    err.name === "ChunkLoadError" ||
    /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to load chunk|\/_next\/static\/chunks\//i.test(
      message,
    )
  );
}

/**
 * After a deploy, browsers can keep an old Turbopack runtime that requests
 * deleted chunk URLs (404). Recover with one hard PWA reset to the same path.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const recover = () => {
      try {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      } catch {
        // still attempt recovery
      }
      const pathname = window.location.pathname || "/ops/login";
      // Avoid bouncing auth forms with ?_v=… mid-login.
      if (
        pathname === "/ops/login" ||
        pathname === "/ops/reset-app" ||
        pathname === "/ops/forgot-password" ||
        pathname === "/ops/reset-password" ||
        pathname.startsWith("/ops/verify-email")
      ) {
        void hardResetPwa(undefined, "/ops/login");
        return;
      }
      void hardResetPwa(undefined, pathname);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadFailure(event.reason)) return;
      event.preventDefault();
      recover();
    };

    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadFailure(event.error) && !/ChunkLoadError|Failed to load chunk/i.test(event.message)) {
        return;
      }
      recover();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);

    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
