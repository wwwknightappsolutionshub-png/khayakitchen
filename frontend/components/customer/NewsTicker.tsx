"use client";

interface NewsTickerProps {
  messages: string[];
}

export function NewsTicker({ messages }: NewsTickerProps) {
  if (messages.length === 0) return null;

  const label = messages.join("   •   ");
  const loop = `${label}   •   ${label}`;

  return (
    <div className="relative mt-0.5 h-5 w-full min-w-0 overflow-hidden">
      <div
        className="news-ticker-track absolute whitespace-nowrap text-xs font-medium leading-5 text-[var(--foreground)]"
        aria-live="polite"
      >
        {loop}
      </div>
    </div>
  );
}
