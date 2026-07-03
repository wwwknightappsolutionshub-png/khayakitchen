"use client";

import { useEffect } from "react";
import { useStorefront } from "@/hooks/useStorefront";

function darken(hex: string, amount = 0.12): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const r = Math.max(0, parseInt(normalized.slice(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(normalized.slice(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(normalized.slice(4, 6), 16) * (1 - amount));
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export function StorefrontTheme({ children }: { children: React.ReactNode }) {
  const { data } = useStorefront();

  useEffect(() => {
    const root = document.querySelector(".customer-app") as HTMLElement | null;
    if (!root) return;

    const primary = data?.branding?.primary_color;
    const secondary = data?.branding?.secondary_color;

    if (primary) {
      root.style.setProperty("--primary", primary);
      root.style.setProperty("--primary-hover", darken(primary));
    }
    if (secondary) {
      root.style.setProperty("--secondary", secondary);
    }

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-hover");
      root.style.removeProperty("--secondary");
    };
  }, [data?.branding?.primary_color, data?.branding?.secondary_color]);

  return <>{children}</>;
}
