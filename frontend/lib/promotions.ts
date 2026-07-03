export type PromoType = "loyalty" | "referral" | "special-booking";

export interface Promotion {
  id: PromoType;
  title: string;
  headline: string;
  description: string;
  cta: string;
  href: string;
  badge: string;
  image: string;
  accent: "primary" | "secondary" | "highlight";
}

export const PROMOTIONS: Promotion[] = [
  {
    id: "loyalty",
    title: "Khaya Rewards",
    headline: "10 meals = 1 free",
    description:
      "Every order earns progress toward a complimentary meal. Track your rewards in your account.",
    cta: "Start earning",
    href: "/account",
    badge: "Loyalty",
    image:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80",
    accent: "primary",
  },
  {
    id: "referral",
    title: "Share the flavour",
    headline: "Refer a friend, both save",
    description:
      "Invite someone new. You both get £5 off your next order when they complete their first checkout.",
    cta: "Refer now",
    href: "/account",
    badge: "Referral",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
    accent: "secondary",
  },
  {
    id: "special-booking",
    title: "Special bookings",
    headline: "Pre-order for events & catering",
    description:
      "Planning a gathering? Schedule pickup or delivery in advance and we'll have everything ready on time.",
    cta: "Book a slot",
    href: "/checkout",
    badge: "Pre-order",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    accent: "highlight",
  },
];

const SEEN_KEY = "khayaos-promos-seen";

export function getUnseenPromo(): Promotion | null {
  if (typeof window === "undefined") return null;
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    return PROMOTIONS.find((p) => !seen.includes(p.id)) ?? null;
  } catch {
    return PROMOTIONS[0] ?? null;
  }
}

export function markPromoSeen(id: PromoType): void {
  if (typeof window === "undefined") return;
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    if (!seen.includes(id)) {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id]));
    }
  } catch {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([id]));
  }
}
