"use client";

interface NewsTickerProps {
  messages: string[];
}

export function NewsTicker({ messages }: NewsTickerProps) {
  if (messages.length === 0) return null;

  const label = messages.join("   •   ");
  const loop = `${label}   •   ${label}`;

  return (
    <div className="relative h-5 max-w-[11rem] overflow-hidden sm:max-w-[14rem]">
      <div
        className="news-ticker-track absolute whitespace-nowrap text-xs font-medium leading-5 text-[var(--foreground)]"
        aria-live="polite"
      >
        {loop}
      </div>
    </div>
  );
}
