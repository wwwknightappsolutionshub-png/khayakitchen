"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { marketingService } from "@/services/marketing.service";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const WA = "https://wa.me/447756183484";

type Turn = { role: "user" | "assistant"; content: string };

/** AI-assisted marketing chatbot with WhatsApp fallback. */
export function MarketingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "Hi — ask about KhayaOS features, marketplaces vs owning your customers, or getting started. I can hand you to WhatsApp anytime.",
    },
  ]);
  const [whatsappUrl, setWhatsappUrl] = useState(WA);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    const nextHistory = [...turns, { role: "user" as const, content: message }];
    setTurns(nextHistory);
    setInput("");
    setBusy(true);

    try {
      const res = await marketingService.chat(
        message,
        nextHistory.map((t) => ({ role: t.role, content: t.content })),
      );
      setWhatsappUrl(res.whatsapp_url || WA);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.suggest_whatsapp
            ? `${res.reply}\n\nPrefer a human? Continue on WhatsApp.`
            : res.reply,
        },
      ]);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not reach the assistant just now. Continue on WhatsApp +44 7756 183484 and we will help you directly.",
        },
      ]);
      setWhatsappUrl(WA);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open KhayaOS chat"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg sm:right-6",
          marketingTheme.primaryButton,
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed bottom-24 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14100c] shadow-2xl sm:right-6">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">KhayaOS assistant</p>
              <p className="text-[11px] text-zinc-500">AI answers · WhatsApp fallback</p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto px-3 py-3">
            {turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  turn.role === "user"
                    ? "ml-auto bg-amber-500/20 text-amber-50"
                    : "bg-white/5 text-zinc-200",
                )}
              >
                {turn.content}
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className={cn("mb-2 block text-center text-xs font-medium", marketingTheme.link)}
            >
              Chat on WhatsApp +44 7756 183484
            </a>
            <form onSubmit={(e) => void send(e)} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about KhayaOS…"
                className="h-10 flex-1 rounded-full border border-white/10 bg-[#0a0806] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/40"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className={cn(
                  "rounded-full px-4 text-sm font-semibold text-white disabled:opacity-50",
                  marketingTheme.primaryButton,
                )}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
