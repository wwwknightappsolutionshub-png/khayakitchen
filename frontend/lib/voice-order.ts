import type { Meal } from "@/lib/types";

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
  return (meal.options ?? []).some((group) => (group.options?.length ?? 0) > 0);
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
