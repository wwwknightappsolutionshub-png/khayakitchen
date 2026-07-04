"use client";

interface NewsTickerProps {
  messages: string[];
}

export function NewsTicker({ messages }: NewsTickerProps) {
  if (messages.length === 0) return null;

  const label = messages.join("   •   ");
  const loop = `${label}   •   ${label}`;

  return (
    <div className="relative h-7 w-full overflow-hidden">
      <div
        className="news-ticker-track absolute whitespace-nowrap text-sm font-bold leading-7 text-[var(--foreground)]"
        aria-live="polite"
      >
        {loop}
      </div>
    </div>
  );
}
