"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { engagementService } from "@/services/engagement.service";
import { useUiStore } from "@/stores/ui-store";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useChatTyping, useTypingPublisher } from "@/hooks/useChatTyping";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const NAME_STORAGE_KEY = "khayaos-customer-name";
const THREAD_STORAGE_KEY = "khayaos-customer-chat-thread";
const GUEST_KEY_STORAGE = "khayaos-guest-key";

function getOrCreateGuestKey(): string {
  if (typeof window === "undefined") return "ssr-guest";
  const existing = localStorage.getItem(GUEST_KEY_STORAGE);
  if (existing) return existing;
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(GUEST_KEY_STORAGE, key);
  return key;
}

/** Always keep guest_key so checkout phone does not orphan the guest thread. */
function chatIdentity(phone: string): { phone?: string; guest_key: string } {
  if (typeof window === "undefined") {
    const trimmed = phone.trim();
    return trimmed ? { phone: trimmed, guest_key: "ssr-guest" } : { guest_key: "ssr-guest" };
  }
  const guest_key = getOrCreateGuestKey();
  const trimmed = phone.trim();
  if (trimmed) return { phone: trimmed, guest_key };
  return { guest_key };
}

function formatMsgTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

function MessageBubble({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  return (
    <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          mine
            ? "rounded-br-md bg-[var(--primary)] text-white"
            : "rounded-bl-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]",
        )}
      >
        {!mine && message.sender_label && (
          <p className="mb-0.5 text-[11px] font-medium opacity-70">{message.sender_label}</p>
        )}
        <p className="whitespace-pre-wrap break-words leading-snug">{message.body}</p>
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            mine ? "text-white/75" : "text-[var(--muted)]",
          )}
        >
          {formatMsgTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export function CustomerChatPanel() {
  const queryClient = useQueryClient();
  const open = useUiStore((s) => s.customerChatOpen);
  const closeCustomerChat = useUiStore((s) => s.closeCustomerChat);
  const [phone, setPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
  });
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(NAME_STORAGE_KEY) ?? "";
  });
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(THREAD_STORAGE_KEY);
  });
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollInterval = useHybridInterval(3_000, 8_000);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhone(localStorage.getItem(PHONE_STORAGE_KEY) ?? "");
    setName(localStorage.getItem(NAME_STORAGE_KEY) ?? "");
  }, [open]);

  const identity = useMemo(() => chatIdentity(phone), [phone]);
  const remoteTyping = useChatTyping(open ? threadId : null, ["customer"]);

  const publishTyping = useCallback(
    (isTyping: boolean) => {
      if (!threadId) return;
      return engagementService.setCustomerChatTyping(threadId, identity, isTyping);
    },
    [threadId, identity.phone, identity.guest_key],
  );
  const onCompose = useTypingPublisher(open && !!threadId, publishTyping);

  const thread = useQuery({
    queryKey: ["customer-chat", threadId, identity.phone ?? "", identity.guest_key],
    queryFn: () => engagementService.getCustomerChat(threadId!, identity),
    enabled: open && !!threadId,
    refetchInterval: open ? pollInterval : false,
    retry: false,
  });

  useEffect(() => {
    // Clear sticky errors after a successful poll/refetch (isSuccess alone won't re-fire).
    if (thread.isSuccess && thread.dataUpdatedAt) {
      setError(null);
    } else if (thread.isError && thread.error) {
      setError(thread.error instanceof Error ? thread.error.message : "Chat failed");
    }
  }, [thread.isSuccess, thread.isError, thread.error, thread.dataUpdatedAt]);

  const openChat = useMutation({
    mutationFn: () =>
      engagementService.openCustomerChat({
        ...identity,
        name: name.trim() || undefined,
        subject: "Customer support",
      }),
    onSuccess: (res) => {
      if (phone.trim()) localStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      if (name.trim()) localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      localStorage.setItem(THREAD_STORAGE_KEY, res.thread.id);
      setThreadId(res.thread.id);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["customer-chat", res.thread.id] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const send = useMutation({
    mutationFn: () => {
      setError(null);
      return engagementService.postCustomerChatMessage(threadId!, identity, body);
    },
    onSuccess: () => {
      setBody("");
      onCompose(false);
      setError(null);
      queryClient.invalidateQueries({
        queryKey: ["customer-chat", threadId, identity.phone ?? "", identity.guest_key],
      });
    },
    onError: (err: Error) => {
      // Prefer showing the conversation; clear transient server errors once messages refresh.
      setError(err.message);
      queryClient
        .invalidateQueries({
          queryKey: ["customer-chat", threadId, identity.phone ?? "", identity.guest_key],
        })
        .then(() => setError(null));
    },
  });

  const messages = useMemo(() => thread.data?.thread.messages ?? [], [thread.data]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length, remoteTyping, open]);

  return (
    <ModalPortal open={open} onClose={closeCustomerChat}>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
        <div className="flex h-[min(88vh,640px)] max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold">Chat with restaurant</h2>
              <p className="text-xs text-[var(--muted)]">
                {remoteTyping ? `${remoteTyping.actor_label} is typing…` : "Usually replies quickly"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              onClick={closeCustomerChat}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            {!threadId && (
              <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm text-[var(--muted)]">
                  Guests can chat without a phone. Add a phone if you already ordered with one.
                </p>
                <input
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  placeholder="Phone (optional for guests)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={openChat.isPending}
                  onClick={() => openChat.mutate()}
                >
                  Start chat
                </Button>
              </div>
            )}

            {threadId && messages.length === 0 && !thread.isLoading && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <MessageCircle className="h-8 w-8 text-[var(--muted)]" />
                <p className="text-sm font-medium">Say hello</p>
                <p className="text-xs text-[var(--muted)]">Ask about your order, menu, or pickup.</p>
              </div>
            )}

            {threadId &&
              messages.map((m) => (
                <MessageBubble key={m.id} message={m} mine={m.sender_type === "customer"} />
              ))}
          </div>

          {threadId && (
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-end gap-2">
                <textarea
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                  value={body}
                  rows={1}
                  onChange={(e) => {
                    setBody(e.target.value);
                    onCompose(e.target.value.trim().length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (body.trim() && !send.isPending) send.mutate();
                    }
                  }}
                  placeholder="Type a message"
                />
                <Button
                  className="h-11 w-11 shrink-0 rounded-full p-0"
                  disabled={!body.trim() || send.isPending}
                  onClick={() => send.mutate()}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
