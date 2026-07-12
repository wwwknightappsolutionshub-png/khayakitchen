"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  "#004D40",
  "#E07A5F",
  "#81B29A",
  "#F2CC8F",
  "#F4F1DE",
  "#1A1A2E",
  "#3D405B",
  "#E63946",
  "#457B9D",
  "#2A9D8F",
  "#264653",
  "#E9C46A",
] as const;

function normalizeHex(value: string | null | undefined, fallback = "#000000"): string {
  if (!value || !String(value).trim()) return fallback;
  let hex = String(value).trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }
  return fallback;
}

export interface ColorFieldProps {
  label: string;
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (hex: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function ColorField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  disabled = false,
  error,
  className,
}: ColorFieldProps) {
  const inputId = useId();
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() =>
    normalizeHex(defaultValue ?? value ?? undefined, "#004D40"),
  );

  useEffect(() => {
    if (isControlled) {
      setInternal(normalizeHex(value, "#004D40"));
    }
  }, [isControlled, value]);

  const current = isControlled ? normalizeHex(value, "#004D40") : internal;

  const setColor = (nextRaw: string) => {
    const next = normalizeHex(nextRaw, current);
    if (!isControlled) {
      setInternal(next);
    }
    onChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>

      <div
        className={cn(
          "flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2",
          disabled && "opacity-50",
        )}
      >
        <input
          id={inputId}
          type="color"
          value={current}
          disabled={disabled}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent p-0 disabled:cursor-not-allowed"
          aria-label={`${label} picker`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Tap the square to pick a color</p>
          <p className="mt-0.5 font-mono text-xs text-foreground/70">{current}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((preset) => {
          const selected = current.toUpperCase() === preset;
          return (
            <button
              key={preset}
              type="button"
              title={preset}
              disabled={disabled}
              aria-label={`Use ${preset}`}
              aria-pressed={selected}
              onClick={() => setColor(preset)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform disabled:cursor-not-allowed",
                selected
                  ? "scale-110 border-foreground"
                  : "border-transparent hover:scale-105 hover:border-border",
              )}
              style={{ backgroundColor: preset }}
            />
          );
        })}
      </div>

      {name ? <input type="hidden" name={name} value={current} /> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
