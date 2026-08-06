"use client";

import { cn } from "@/lib/utils";

interface KitchenAvatarProps {
  name?: string | null;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
}

function initialsFromName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "K";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase().slice(0, 2);
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function KitchenAvatar({ name, logoUrl, className, size = "md" }: KitchenAvatarProps) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name ? `${name} logo` : "Kitchen logo"}
        className={cn(
          "shrink-0 rounded-lg border border-border bg-surface-elevated object-contain",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-white",
        sizeClass,
        className,
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}
