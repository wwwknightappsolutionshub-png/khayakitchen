"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { marketingService } from "@/services/marketing.service";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

const WA = "https://wa.me/447756183484";

type Turn = { role: "user" | "assistant"; content: string };

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Natural marketing chatbot with typing lag and WhatsApp email handoff. */
export function MarketingChatbot() {
  const { theme, mode } = useMarketingTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "Hey — ask me anything about KhayaOS. If I get stuck, I'll pass you to a human on WhatsApp (I'll just need your email so we can send the chat history).",
    },
  ]);
  const [whatsappUrl, setWhatsappUrl] = useState(WA);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, typing, awaitingEmail]);

  const runAssistant = async (
    message: string,
    history: Turn[],
    emailOverride?: string,
  ) => {
    setBusy(true);
    setTyping(true);
    const lag = 1800 + Math.floor(Math.random() * 1800);
    await sleep(lag);

    try {
      const res = await marketingService.chat(
        message,
        history.map((t) => ({ role: t.role, content: t.content })),
        emailOverride,
      );
      setWhatsappUrl(res.whatsapp_url || WA);
      setTyping(false);
      setTurns((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setAwaitingEmail(Boolean(res.needs_email) && !res.handoff);

      if (res.handoff && res.whatsapp_url) {
        window.setTimeout(() => {
          window.open(res.whatsapp_url, "_blank", "noopener,noreferrer");
        }, 600);
      }
    } catch {
      setTyping(false);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I lost the connection for a second. Share your email and I'll pass you straight to WhatsApp +44 7756 183484 with our chat.",
        },
      ]);
      setAwaitingEmail(true);
      setWhatsappUrl(WA);
    } finally {
      setBusy(false);
      setTyping(false);
    }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    const nextHistory = [...turns, { role: "user" as const, content: message }];
    setTurns(nextHistory);
    setInput("");
    await runAssistant(message, nextHistory);
  };

  const sendEmail = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = email.trim();
    if (!value || busy) return;

    const nextHistory = [
      ...turns,
      { role: "user" as const, content: `My email is ${value}` },
    ];
    setTurns(nextHistory);
    setEmail("");
    await runAssistant(value, nextHistory, value);
  };

  const userBubble =
    mode === "light"
      ? "ml-auto bg-amber-100 text-amber-950"
      : "ml-auto bg-amber-500/20 text-amber-50";
  const botBubble =
    mode === "light" ? "bg-stone-100 text-zinc-800" : "bg-white/5 text-zinc-200";
  const typingBubble =
    mode === "light" ? "bg-stone-100 text-zinc-500" : "bg-white/5 text-zinc-400";

  return (
    <>
      <button
        type="button"
        aria-label="Open KhayaOS chat"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg sm:right-6",
          theme.primaryButton,
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open ? (
        <div
          className={cn(
            "fixed bottom-24 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:right-6",
            theme.chatPanel,
          )}
        >
          <div className={cn("flex items-center justify-between border-b px-4 py-3", theme.surfaceBorder)}>
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-ops-192.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
              <div>
                <p className={cn("text-sm font-semibold", theme.heading)}>KhayaOS assistant</p>
                <p className={cn("text-[11px]", theme.subtle)}>Usually replies in a few seconds</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className={cn("rounded-full p-1", theme.iconButton)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollerRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto px-3 py-3">
            {turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  turn.role === "user" ? userBubble : botBubble,
                )}
              >
                {turn.content}
              </div>
            ))}
            {typing ? (
              <div className={cn("max-w-[85%] rounded-2xl px-3 py-2.5 text-sm", typingBubble)}>
                <span className="sr-only">Typing you a response</span>
                <span className="inline-flex items-center gap-1">
                  Typing you a response
                  <span className="marketing-chat-dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          <div className={cn("border-t p-3", theme.surfaceBorder)}>
            {awaitingEmail ? (
              <form onSubmit={(e) => void sendEmail(e)} className="space-y-2">
                <p className={cn("text-xs", theme.muted)}>
                  Email for WhatsApp handoff (we attach this chat history):
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@kitchen.com"
                    className={cn(
                      "h-10 flex-1 rounded-full border px-3 text-sm outline-none",
                      theme.input,
                    )}
                  />
                  <button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className={cn(
                      "rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50",
                      theme.primaryButton,
                    )}
                  >
                    Send
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => void send(e)} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about KhayaOS…"
                  disabled={busy}
                  className={cn(
                    "h-10 flex-1 rounded-full border px-3 text-sm outline-none disabled:opacity-60",
                    theme.input,
                  )}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className={cn(
                    "rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50",
                    theme.primaryButton,
                  )}
                >
                  Send
                </button>
              </form>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className={cn("mt-2 block text-center text-xs font-medium", theme.link)}
            >
              Or open WhatsApp +44 7756 183484
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
