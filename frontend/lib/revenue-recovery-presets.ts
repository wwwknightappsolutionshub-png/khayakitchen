import type { CreateRevenueRecoveryCampaignPayload } from "@/services/revenue-recovery.service";

function minDateTimeLocal(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function defaultEnd(start: string, hours: number): string {
  const date = new Date(start);
  date.setMinutes(date.getMinutes() + Math.round(hours * 60));
  return toLocalInput(date);
}

function happyHourWindow(): { startsAt: string; endsAt: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(17, 0, 0, 0);
  const end = new Date(now);
  end.setHours(19, 0, 0, 0);

  if (now >= end) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  } else if (now > start) {
    start.setMinutes(now.getMinutes() + 5);
    start.setSeconds(0, 0);
  }

  return { startsAt: toLocalInput(start), endsAt: toLocalInput(end) };
}

export interface CampaignFormPreset {
  discountType: CreateRevenueRecoveryCampaignPayload["discount_type"];
  discountValue: string;
  startsAt: string;
  endsAt: string;
  notificationTitle: string;
  notificationMessage: string;
  targetAudience: CreateRevenueRecoveryCampaignPayload["target_audience"];
}

export function getCampaignTypePreset(
  type: CreateRevenueRecoveryCampaignPayload["campaign_type"],
): CampaignFormPreset {
  const start = minDateTimeLocal();

  switch (type) {
    case "closing_soon":
      return {
        discountType: "percent",
        discountValue: "15",
        startsAt: start,
        endsAt: defaultEnd(start, 1.5),
        notificationTitle: "Kitchen closing soon",
        notificationMessage: "Last call for tonight — order now with exclusive savings before we close.",
        targetAudience: "active_customers",
      };
    case "happy_hour": {
      const window = happyHourWindow();
      return {
        discountType: "percent",
        discountValue: "20",
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        notificationTitle: "Happy hour is live",
        notificationMessage: "Limited-time happy hour pricing — tap to order before it ends.",
        targetAudience: "all",
      };
    }
    case "slow_period":
      return {
        discountType: "percent",
        discountValue: "15",
        startsAt: start,
        endsAt: defaultEnd(start, 3),
        notificationTitle: "Slow period special",
        notificationMessage: "Beat the rush with a limited offer on selected meals.",
        targetAudience: "repeat_customers",
      };
    case "proximity": {
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      return {
        discountType: "percent",
        discountValue: "0",
        startsAt: start,
        endsAt: toLocalInput(end),
        notificationTitle: "You are nearby",
        notificationMessage: "Stop by — we are close and ready for pickup orders.",
        targetAudience: "all",
      };
    }
    default:
      return {
        discountType: "percent",
        discountValue: "15",
        startsAt: start,
        endsAt: defaultEnd(start, 2),
        notificationTitle: "",
        notificationMessage: "",
        targetAudience: "all",
      };
  }
}
