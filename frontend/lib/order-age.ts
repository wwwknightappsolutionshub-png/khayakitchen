export type OrderAgeTone = "fresh" | "aging" | "stale";

/** Age bands for open orders: <5m orange, 5–10m red, ≥10m grey. */
export function getOrderAgeTone(createdAt: string, nowMs = Date.now()): OrderAgeTone {
  const ageMinutes = (nowMs - new Date(createdAt).getTime()) / 60_000;
  if (ageMinutes < 5) return "fresh";
  if (ageMinutes < 10) return "aging";
  return "stale";
}

export function getOrderAgeRowClass(tone: OrderAgeTone): string {
  switch (tone) {
    case "fresh":
      return "bg-orange-500/15 ring-1 ring-inset ring-orange-500/40";
    case "aging":
      return "bg-red-500/15 ring-1 ring-inset ring-red-500/40";
    case "stale":
      return "bg-zinc-500/20 ring-1 ring-inset ring-zinc-500/40";
  }
}

export function getOrderAgeCardClass(tone: OrderAgeTone): string {
  switch (tone) {
    case "fresh":
      return "border-orange-500/60 bg-orange-500/10";
    case "aging":
      return "border-red-500/60 bg-red-500/10";
    case "stale":
      return "border-zinc-500/50 bg-zinc-500/10";
  }
}

export function dayKeyFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayHeading(dayKey: string): string {
  if (dayKey === todayKey()) return "Today";
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
