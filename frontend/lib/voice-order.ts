import type { CartItem, CustomerAddress, Meal, MealOption, MealOptionGroup } from "./types";
import { getCheckboxOptionGroups } from "./meal-options";

/** Local-device greeting for Voice Order Assistant. */
export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function buildVoiceGreeting(kitchenName?: string | null): string {
  const name = kitchenName?.trim() || "our kitchen";
  return `${timeOfDayGreeting()}! Welcome to ${name}. What meal would you like to eat today?`;
}

function normalizeSpeech(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AFFIRM_EXACT = new Set([
  "yes",
  "yeah",
  "yep",
  "yup",
  "ok",
  "okay",
  "sure",
  "confirm",
  "correct",
  "right",
  "please",
  "go ahead",
  "that one",
  "that one please",
  "this one",
  "add it",
  "add that",
  "add to cart",
  "yes please",
  "yes that one",
  "yeah that one",
]);

const AFFIRM_PREFIX =
  /^(yes|yeah|yep|yup|ok|okay|sure|confirm|correct|right|please|go ahead|that one|this one|add it|add that)\b/;

const NEGATIVE_EXACT = new Set(["no", "nope", "nah", "cancel", "wrong"]);
const NEGATIVE_PREFIX = /^(no|nope|nah|cancel|never mind|nevermind|not that|wrong)\b/;

/** Spoken confirm after the assistant offered meal match(es). */
export function isVoiceAffirmative(text: string): boolean {
  const q = normalizeSpeech(text);
  if (!q) return false;
  return AFFIRM_EXACT.has(q) || AFFIRM_PREFIX.test(q);
}

/** Spoken reject of the offered match(es). */
export function isVoiceNegative(text: string): boolean {
  const q = normalizeSpeech(text);
  if (!q) return false;
  return NEGATIVE_EXACT.has(q) || NEGATIVE_PREFIX.test(q);
}

/**
 * Fuzzy match spoken/typed text against active menu meals.
 * Returns best matches first (max 5).
 */
export function matchMealsFromSpeech(query: string, meals: Meal[], limit = 5): Meal[] {
  const q = normalizeSpeech(query);
  if (!q || meals.length === 0) return [];

  const scored = meals
    .filter((m) => m.is_active !== false)
    .map((meal) => {
      const name = normalizeSpeech(meal.name);
      const desc = normalizeSpeech(meal.description ?? "");
      let score = 0;
      if (name === q) score += 100;
      if (name.includes(q) || q.includes(name)) score += 60;
      const qWords = q.split(" ").filter((w) => w.length > 2);
      for (const word of qWords) {
        if (name.includes(word)) score += 18;
        if (desc.includes(word)) score += 6;
      }
      return { meal, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((row) => row.meal);
}

export function mealNeedsCustomization(meal: Meal): boolean {
  return optionGroupsForVoice(meal).length > 0;
}

export function optionGroupsForVoice(meal: Meal): MealOptionGroup[] {
  return (meal.options ?? []).filter((group) => (group.options?.length ?? 0) > 0);
}

export function isMultiSelectGroup(group: MealOptionGroup): boolean {
  return getCheckboxOptionGroups([group]).length > 0;
}

const QTY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  couple: 2,
  few: 3,
  dozen: 12,
};

const QTY_STRIP =
  /^(?:(?:i\s+(?:want|need|ll have|would like)\s+)?(?:(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple|few|dozen))\s+(?:plates?\s+of\s+|portions?\s+of\s+|orders?\s+of\s+|x\s+)?)(.+)$/i;

export function parseSpokenQuantity(text: string): number | null {
  const q = normalizeSpeech(text);
  if (!q) return null;
  if (/^(just\s+)?one\b/.test(q) || q === "a" || q === "an") return 1;
  const exact = QTY_WORDS[q];
  if (exact) return clampQuantity(exact);
  const digits = q.match(/^\d{1,2}$/);
  if (digits) return clampQuantity(Number(digits[0]));
  const xMatch = q.match(/^(\d{1,2})\s*x$/);
  if (xMatch) return clampQuantity(Number(xMatch[1]));
  return null;
}

function clampQuantity(n: number): number | null {
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(20, Math.floor(n));
}

/** Pull a leading quantity off a meal utterance: "two jollof" → { quantity: 2, rest: "jollof" }. */
export function stripQuantityPrefix(text: string): { quantity: number | null; rest: string } {
  const raw = text.trim();
  if (!raw) return { quantity: null, rest: "" };
  const match = raw.match(QTY_STRIP);
  if (!match) return { quantity: parseSpokenQuantity(raw), rest: raw };
  const qty = parseSpokenQuantity(match[1] ?? "");
  const rest = (match[2] ?? "").trim();
  if (!qty || !rest || /^(please|thanks|thank you)$/i.test(rest)) {
    return { quantity: qty, rest: raw };
  }
  return { quantity: qty, rest };
}

export function isCheckoutIntent(text: string): boolean {
  const q = normalizeSpeech(text);
  if (!q) return false;
  return (
    /^(that s all|thats all|that is all|nothing else|no more|i m done|im done|done|checkout|check out|go to checkout)$/.test(
      q,
    ) ||
    /\b(checkout|check out|place (the )?order|send (the )?order|pay now|that s all|thats all)\b/.test(q)
  );
}

export function isSendOrderIntent(text: string): boolean {
  const q = normalizeSpeech(text);
  if (!q) return false;
  return (
    /^(send( it)?|send (the )?order|place (the )?order|place it|pay|pay now|confirm order|submit)$/.test(q) ||
    isVoiceAffirmative(q)
  );
}

export function isAnythingElseNo(text: string): boolean {
  const q = normalizeSpeech(text);
  if (!q) return false;
  return (
    isCheckoutIntent(q) ||
    /^(no|nope|nah|no thanks|that s all|thats all|nothing else|i m done|im done|done)$/.test(q)
  );
}

export function isAnythingElseYes(text: string): boolean {
  const q = normalizeSpeech(text);
  if (!q) return false;
  return /^(yes|yeah|yep|another|one more|add more|something else)$/.test(q);
}

export function parseOrderType(text: string): "pickup" | "delivery" | null {
  const q = normalizeSpeech(text);
  if (!q) return null;
  if (/\b(deliver|delivery|drop off|dropped off|send it|to my (house|place|address))\b/.test(q)) {
    return "delivery";
  }
  if (/\b(pick ?up|collect|collection|i ll come|ill come|come get)\b/.test(q)) {
    return "pickup";
  }
  return null;
}

export function isAsapTime(text: string): boolean {
  const q = normalizeSpeech(text);
  return /^(asap|now|soon|as soon as possible|right now|immediately|whenever)$/.test(q);
}

export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Spoken pickup/delivery time → datetime-local, or null if unparseable. */
export function parseScheduledTime(text: string, now: Date = new Date()): string | null {
  const q = normalizeSpeech(text);
  if (!q || isAsapTime(q)) return null;

  const inMatch = q.match(/^in\s+(\d+|an|a|one|two|three|four|five)\s+(minutes?|hours?|hrs?)$/);
  if (inMatch) {
    const raw = inMatch[1];
    const n = QTY_WORDS[raw] ?? (raw === "an" || raw === "a" ? 1 : Number(raw));
    if (!Number.isFinite(n) || n < 1 || n > 720) return null;
    const unit = inMatch[2];
    const ms = /hour|hr/.test(unit) ? n * 60 * 60 * 1000 : n * 60 * 1000;
    return toDatetimeLocal(new Date(now.getTime() + ms));
  }

  const tomorrow = /\btomorrow\b/.test(q);
  const timeMatch = q.match(/\b(\d{1,2})(?:\s*[:.]\s*(\d{2}))?\s*(a m|p m|am|pm)?\b/);
  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
  const mer = (timeMatch[3] ?? "").replace(/\s+/g, "");
  if (hour > 23 || minute > 59) return null;

  if (mer === "am" || mer === "a m") {
    if (hour === 12) hour = 0;
  } else if (mer === "pm" || mer === "p m") {
    if (hour < 12) hour += 12;
  } else if (hour < 8) {
    hour += 12;
  }

  const target = new Date(now);
  if (tomorrow) target.setDate(target.getDate() + 1);
  target.setHours(hour, minute, 0, 0);
  if (!tomorrow && target.getTime() < now.getTime() - 60_000) {
    target.setDate(target.getDate() + 1);
  }
  return toDatetimeLocal(target);
}

export function parsePaymentMethod(text: string): "card" | "transfer" | null {
  const q = normalizeSpeech(text);
  if (!q) return null;
  if (/\b(card|debit|credit|paystack|visa|mastercard)\b/.test(q)) return "card";
  if (/\b(transfer|bank|bank transfer)\b/.test(q)) return "transfer";
  return null;
}

const SKIP_EXTRAS = /^(none|no|no extras|no extra|skip|nothing|no thanks|done|that s all|thats all)$/;

export function isSkipExtras(text: string): boolean {
  return SKIP_EXTRAS.test(normalizeSpeech(text));
}

export function matchOptionsFromSpeech(query: string, options: MealOption[], limit = 5): MealOption[] {
  const q = normalizeSpeech(query);
  if (!q || options.length === 0) return [];

  const scored = options
    .map((option) => {
      const name = normalizeSpeech(option.name);
      let score = 0;
      if (name === q) score += 100;
      if (name.includes(q) || q.includes(name)) score += 60;
      const qWords = q.split(" ").filter((w) => w.length > 1);
      for (const word of qWords) {
        if (name.includes(word)) score += 18;
      }
      return { option, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((row) => row.option);
}

const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

export function parseSpokenPhone(text: string): string | null {
  const q = normalizeSpeech(text);
  const fromDigits = q.replace(/\D/g, "");
  if (fromDigits.length >= 7 && fromDigits.length <= 15) return fromDigits;

  const words = q.split(" ");
  let built = "";
  for (const word of words) {
    if (DIGIT_WORDS[word] != null) built += DIGIT_WORDS[word];
    else if (/^\d$/.test(word)) built += word;
  }
  if (built.length >= 7 && built.length <= 15) return built;
  return null;
}

export function looksLikeSpokenName(text: string): boolean {
  const q = text.trim();
  if (q.length < 2) return false;
  if (isCheckoutIntent(q) || isVoiceNegative(q) || isSendOrderIntent(q)) return false;
  if (parseSpokenPhone(q)) return false;
  return !/^\d+$/.test(normalizeSpeech(q));
}

export function formatCustomerAddressLine(a: Pick<CustomerAddress, "line1" | "line2" | "city" | "state" | "postal_code">): string {
  return [a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(", ");
}

export function cartLineLabel(item: CartItem): string {
  const opts = item.selectedOptions.length
    ? ` (${item.selectedOptions.map((o) => o.name).join(", ")})`
    : "";
  return `${item.quantity}× ${item.mealName}${opts}`;
}

export type VoiceCartPricing = {
  basePrice: number;
  originalBasePrice?: number;
  campaignId?: string | null;
};

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
      length: number;
    };
  };
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Speak text; resolves when utterance ends (or immediately if TTS unavailable). */
export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => finish();
      utterance.onerror = () => finish();
      window.speechSynthesis.speak(utterance);
      const fallbackMs = Math.min(16_000, Math.max(2_000, text.length * 75));
      window.setTimeout(finish, fallbackMs);
    } catch {
      finish();
    }
  });
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
