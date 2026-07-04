"use client";

import { useEffect, useState } from "react";

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface StatusCountdownProps {
  endsAt?: string | null;
  className?: string;
  expiredLabel?: string;
}

export function StatusCountdown({
  endsAt,
  className,
  expiredLabel = "Ended",
}: StatusCountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const end = new Date(endsAt).getTime();
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (remaining === null) return null;

  return (
    <span className={className} aria-live="polite">
      {remaining > 0 ? formatCountdown(remaining) : expiredLabel}
    </span>
  );
}

/** @deprecated Use StatusCountdown */
export function ClosingSoonCountdown(props: StatusCountdownProps) {
  return <StatusCountdown {...props} expiredLabel="Closed" />;
}
