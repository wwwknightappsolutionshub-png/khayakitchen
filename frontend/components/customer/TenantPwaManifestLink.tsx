"use client";

import { useEffect } from "react";
import { useStorefront } from "@/hooks/useStorefront";

const MANIFEST_LINK_ID = "khayaos-tenant-manifest";
const OPS_MANIFEST_LINK_ID = "khayaos-ops-manifest";

export function TenantPwaManifestLink() {
  const { data } = useStorefront();
  const slug = data?.workspace?.slug;
  const manifestPath = data?.pwa?.manifest_path ?? (slug ? `/pwa-manifest/${slug}` : null);
  const appName = data?.branding?.restaurant_name;

  useEffect(() => {
    if (!manifestPath) return;

    // Customer Order app must not advertise the Ops manifest.
    document.getElementById(OPS_MANIFEST_LINK_ID)?.remove();
    document
      .querySelectorAll('link[rel="manifest"]')
      .forEach((node) => {
        const href = (node as HTMLLinkElement).href || "";
        if (href.includes("manifest-ops") || href.endsWith("/manifest.json")) {
          node.remove();
        }
      });

    let link = document.getElementById(MANIFEST_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = MANIFEST_LINK_ID;
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestPath;

    if (appName) {
      let appleTitle = document.querySelector(
        'meta[name="apple-mobile-web-app-title"]',
      ) as HTMLMetaElement | null;
      if (!appleTitle) {
        appleTitle = document.createElement("meta");
        appleTitle.name = "apple-mobile-web-app-title";
        document.head.appendChild(appleTitle);
      }
      appleTitle.content = appName;
    }

    return () => {
      // Keep tenant manifest link for the session; do not remove on unmount.
    };
  }, [manifestPath, appName]);

  return null;
}
