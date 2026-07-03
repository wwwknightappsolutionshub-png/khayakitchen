import { MENU_SOCIAL_PROOF } from "@/lib/menu-meta";

export function SocialProof({ className }: { className?: string }) {
  return (
    <p className={`text-xs text-[var(--muted)] ${className ?? ""}`}>
      {MENU_SOCIAL_PROOF} · Popular this week
    </p>
  );
}
