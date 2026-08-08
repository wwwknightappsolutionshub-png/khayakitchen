"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import {
  buildVoiceGreeting,
  getSpeechRecognitionConstructor,
  isVoiceAffirmative,
  isVoiceNegative,
  matchMealsFromSpeech,
  mealNeedsCustomization,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
  type VoiceCartPricing,
} from "@/lib/voice-order";
import { formatCurrency, toNumber, cn } from "@/lib/utils";
import type { Meal } from "@/lib/types";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  matches?: Meal[];
};

interface VoiceOrderAssistantProps {
  meals: Meal[];
  kitchenName?: string | null;
  isAcceptingOrders?: boolean;
  /** When the meal has options, open the existing customize flow instead of bare add. */
  onCustomizeMeal?: (meal: Meal) => void;
  /** Resolve list vs promo pricing for direct (no-options) cart adds. */
  getCartPricing?: (meal: Meal) => VoiceCartPricing;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `vo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultCartPricing(meal: Meal): VoiceCartPricing {
  return { basePrice: toNumber(meal.base_price) };
}

export function VoiceOrderAssistant({
  meals,
  kitchenName,
  isAcceptingOrders = true,
  onCustomizeMeal,
  getCartPricing,
}: VoiceOrderAssistantProps) {
  const addItem = useCartStore((s) => s.addItem);
  const triggerCartBounce = useUiStore((s) => s.triggerCartBounce);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const mealsRef = useRef(meals);
  const pendingMatchesRef = useRef<Meal[] | null>(null);
  const openRef = useRef(false);
  const sessionRef = useRef(0);
  const listenAfterSpeakRef = useRef(false);

  mealsRef.current = meals;
  openRef.current = open;

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, listening]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.abort?.();
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      listenAfterSpeakRef.current = false;
      stopSpeaking();
      try {
        recognitionRef.current?.abort?.();
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const appendAssistant = useCallback((text: string, matches?: Meal[]) => {
    setMessages((prev) => [...prev, { id: newId(), role: "assistant", text, matches }]);
  }, []);

  const appendUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: newId(), role: "user", text }]);
  }, []);

  const speakAndMaybeListen = useCallback(
    async (text: string, thenListen: boolean) => {
      const session = sessionRef.current;
      listenAfterSpeakRef.current = thenListen;
      stopListening();
      await speakText(text);
      if (session !== sessionRef.current || !openRef.current) return;
      if (listenAfterSpeakRef.current && getSpeechRecognitionConstructor()) {
        listenAfterSpeakRef.current = false;
        // startListening is defined below; call via ref to avoid TDZ
        startListeningRef.current?.();
      }
    },
    [stopListening],
  );

  const startListeningRef = useRef<(() => void) | null>(null);

  const confirmMeal = useCallback(
    (meal: Meal) => {
      if (!isAcceptingOrders) {
        const msg = "Orders are paused right now. Please try again when the kitchen is open.";
        pendingMatchesRef.current = null;
        appendAssistant(msg);
        void speakAndMaybeListen(msg, false);
        return;
      }

      pendingMatchesRef.current = null;

      if (mealNeedsCustomization(meal) && onCustomizeMeal) {
        const msg = `Great choice — opening options for ${meal.name}.`;
        appendAssistant(msg);
        void speakText(msg).then(() => {
          sessionRef.current += 1;
          listenAfterSpeakRef.current = false;
          stopSpeaking();
          stopListening();
          setOpen(false);
          onCustomizeMeal(meal);
        });
        return;
      }

      const pricing = getCartPricing?.(meal) ?? defaultCartPricing(meal);
      addItem({
        mealId: meal.id,
        mealName: meal.name,
        basePrice: pricing.basePrice,
        originalBasePrice: pricing.originalBasePrice,
        campaignId: pricing.campaignId ?? null,
        quantity: 1,
        selectedOptions: [],
      });
      triggerCartBounce();
      const reply = `${meal.name} (${formatCurrency(pricing.basePrice)}) was added to your cart. Anything else you’d like?`;
      appendAssistant(reply);
      void speakAndMaybeListen(reply, true);
    },
    [
      addItem,
      appendAssistant,
      getCartPricing,
      isAcceptingOrders,
      onCustomizeMeal,
      speakAndMaybeListen,
      stopListening,
      triggerCartBounce,
    ],
  );

  const processUserText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      appendUser(text);

      const pending = pendingMatchesRef.current;
      if (pending && pending.length > 0) {
        if (isVoiceAffirmative(text)) {
          if (pending.length === 1) {
            confirmMeal(pending[0]);
            return;
          }
          const msg = "Please tap the meal you want, or say its name.";
          appendAssistant(msg);
          void speakAndMaybeListen(msg, true);
          return;
        }
        if (isVoiceNegative(text)) {
          pendingMatchesRef.current = null;
          const msg = "No problem. What meal would you like instead?";
          appendAssistant(msg);
          void speakAndMaybeListen(msg, true);
          return;
        }
        // New meal name — clear pending and match again
        pendingMatchesRef.current = null;
      }

      const matches = matchMealsFromSpeech(text, mealsRef.current);
      if (matches.length === 0) {
        const msg =
          "I couldn’t match that to a menu item. Try saying the meal name again, or type it below.";
        appendAssistant(msg);
        void speakAndMaybeListen(msg, true);
        return;
      }

      pendingMatchesRef.current = matches;

      if (!isAcceptingOrders) {
        const msg =
          matches.length === 1
            ? `I found ${matches[0].name}. We’re closed for new orders right now — you can browse, but I can’t add to cart yet.`
            : "I found a few possible matches. We’re closed for new orders — browse only for now.";
        appendAssistant(msg, matches);
        void speakAndMaybeListen(msg, true);
        return;
      }

      if (matches.length === 1) {
        const msg = `I heard you want ${matches[0].name}. Say yes to confirm, or tap Confirm.`;
        appendAssistant(msg, matches);
        void speakAndMaybeListen(msg, true);
        return;
      }

      const msg = "I found a few possible matches. Tap one to confirm, or say the meal name.";
      appendAssistant(msg, matches);
      void speakAndMaybeListen(msg, true);
    },
    [appendAssistant, appendUser, confirmMeal, isAcceptingOrders, speakAndMaybeListen],
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setStatusNote("Voice input isn’t supported on this browser. You can type instead.");
      return;
    }

    stopListening();
    stopSpeaking();
    setStatusNote(null);

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-GB" : "en-GB";

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalTranscript += `${piece} `;
        } else {
          interim += piece;
        }
      }
      setDraft((finalTranscript + interim).trim());
    };

    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setStatusNote("Microphone permission is blocked. Enable it in browser settings, or type your order.");
      } else if (code !== "aborted" && code !== "no-speech") {
        setStatusNote("Couldn’t catch that. Tap the mic and try again, or type below.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const spoken = finalTranscript.trim();
      if (spoken) {
        setDraft("");
        processUserText(spoken);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setStatusNote("Couldn’t start the microphone. Type your order instead.");
      setListening(false);
    }
  }, [processUserText, stopListening]);

  startListeningRef.current = startListening;

  const openAssistant = () => {
    sessionRef.current += 1;
    const session = sessionRef.current;
    stopSpeaking();
    stopListening();
    setOpen(true);
    setDraft("");
    setStatusNote(null);
    pendingMatchesRef.current = null;

    const greeting = buildVoiceGreeting(kitchenName);
    const closedNote = !isAcceptingOrders
      ? " We’re currently closed for new orders, but I can still help you explore the menu."
      : "";
    const full = `${greeting}${closedNote}`;
    setMessages([{ id: newId(), role: "assistant", text: full }]);

    void (async () => {
      await speakText(full);
      if (session !== sessionRef.current || !openRef.current) return;
      if (getSpeechRecognitionConstructor()) {
        startListening();
      }
    })();
  };

  const closeAssistant = () => {
    sessionRef.current += 1;
    listenAfterSpeakRef.current = false;
    stopSpeaking();
    stopListening();
    pendingMatchesRef.current = null;
    setOpen(false);
  };

  const submitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    stopListening();
    processUserText(text);
  };

  return (
    <>
      <button
        type="button"
        onClick={openAssistant}
        className={cn(
          "fixed bottom-24 right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full",
          "bg-[var(--primary)] text-white shadow-lg shadow-black/25",
          "ring-2 ring-[var(--primary)]/30 transition hover:scale-[1.03] active:scale-95",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        )}
        aria-label="Order by voice"
        title="Order by voice"
      >
        <Mic className="h-6 w-6" strokeWidth={2.25} />
      </button>

      <ModalPortal open={open} onClose={closeAssistant}>
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeAssistant}
            aria-label="Close voice order"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Voice order assistant"
            className="relative z-10 flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] customer-animate-in sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold tracking-tight">Voice order</p>
                <p className="text-xs text-[var(--muted)]">
                  Speak or type — confirm before anything is added
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssistant}
                className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "assistant"
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)]"
                      : "ml-auto bg-[var(--primary)] text-white",
                  )}
                >
                  <p>{message.text}</p>
                  {message.matches && message.matches.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {message.matches.map((meal) => (
                        <button
                          key={meal.id}
                          type="button"
                          onClick={() => confirmMeal(meal)}
                          disabled={!isAcceptingOrders}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition",
                            isAcceptingOrders
                              ? "hover:border-[var(--primary)]/50"
                              : "cursor-not-allowed opacity-60",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{meal.name}</span>
                            <span className="text-xs text-[var(--muted)]">
                              {formatCurrency(
                                getCartPricing?.(meal)?.basePrice ?? toNumber(meal.base_price),
                              )}
                              {mealNeedsCustomization(meal) ? " · options available" : ""}
                              {!isAcceptingOrders ? " · closed" : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">
                            {isAcceptingOrders ? "Confirm" : "Browse"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {listening ? (
                <p className="text-center text-xs font-medium text-[var(--primary)]">Listening…</p>
              ) : null}
              {statusNote ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-[var(--foreground)]">
                  {statusNote}
                </p>
              ) : null}
            </div>

            <div className="border-t border-[var(--border)] px-3 py-3">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => (listening ? stopListening() : startListening())}
                  disabled={!speechSupported}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                    listening
                      ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]",
                    !speechSupported && "opacity-40",
                  )}
                  aria-label={listening ? "Stop listening" : "Start listening"}
                  title={
                    speechSupported
                      ? listening
                        ? "Stop listening"
                        : "Speak your order"
                      : "Voice not supported — type instead"
                  }
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitDraft();
                    }
                  }}
                  placeholder="Or type a meal name…"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <CustomerButton
                  type="button"
                  className="h-11 w-11 shrink-0 !px-0"
                  onClick={submitDraft}
                  disabled={!draft.trim()}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </CustomerButton>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
