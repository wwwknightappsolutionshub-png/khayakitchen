"use client";

import { useEffect } from "react";

const MANIFEST_LINK_ID = "khayaos-ops-manifest";
const OPS_MANIFEST = "/manifest-ops.json";

/** Ensures staff/marketing/auth surfaces advertise the Ops PWA manifest. */
export function OpsPwaManifestLink() {
  useEffect(() => {
    let link = document.getElementById(MANIFEST_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = MANIFEST_LINK_ID;
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = OPS_MANIFEST;

    // Prefer Ops over any leftover tenant manifest on this document.
    const tenant = document.getElementById("khayaos-tenant-manifest");
    if (tenant) tenant.remove();

    let appleTitle = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    ) as HTMLMetaElement | null;
    if (!appleTitle) {
      appleTitle = document.createElement("meta");
      appleTitle.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitle);
    }
    appleTitle.content = "KhayaOS Ops";
  }, []);

  return null;
}
