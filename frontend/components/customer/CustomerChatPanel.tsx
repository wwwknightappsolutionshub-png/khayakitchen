"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { engagementService } from "@/services/engagement.service";
import { useUiStore } from "@/stores/ui-store";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const NAME_STORAGE_KEY = "khayaos-customer-name";
const THREAD_STORAGE_KEY = "khayaos-customer-chat-thread";
const GUEST_KEY_STORAGE = "khayaos-guest-key";

function getOrCreateGuestKey(): string {
  const existing = localStorage.getItem(GUEST_KEY_STORAGE);
  if (existing) return existing;
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(GUEST_KEY_STORAGE, key);
  return key;
}

function chatIdentity(phone: string): { phone?: string; guest_key?: string } {
  const trimmed = phone.trim();
  if (trimmed) return { phone: trimmed };
  return { guest_key: getOrCreateGuestKey() };
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
  const identity = chatIdentity(phone);

  const thread = useQuery({
    queryKey: ["customer-chat", threadId, identity.phone ?? identity.guest_key],
    queryFn: () => engagementService.getCustomerChat(threadId!, identity),
    enabled: open && !!threadId,
    refetchInterval: open ? 5000 : false,
  });

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
    mutationFn: () =>
      engagementService.postCustomerChatMessage(threadId!, identity, body),
    onSuccess: () => {
      setBody("");
      setError(null);
      queryClient.invalidateQueries({
        queryKey: ["customer-chat", threadId, identity.phone ?? identity.guest_key],
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <ModalPortal open={open} onClose={closeCustomerChat}>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
        <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-base font-semibold">Chat with restaurant</h2>
            <button
              type="button"
              aria-label="Close chat"
              className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
              onClick={closeCustomerChat}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {error && <p className="text-sm text-rose-400">{error}</p>}

            {!threadId && (
              <div className="space-y-2">
                <p className="text-sm text-[var(--muted)]">
                  Guests can chat without a phone. Add a phone if you already ordered with one.
                </p>
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
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

            {threadId && (
              <div className="space-y-3">
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {(thread.data?.thread.messages ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl bg-[var(--surface-elevated)] p-2 text-sm"
                    >
                      <p className="text-xs text-[var(--muted)]">
                        {m.sender_label || m.sender_type}
                      </p>
                      <p>{m.body}</p>
                    </div>
                  ))}
                  {(thread.data?.thread.messages ?? []).length === 0 && (
                    <p className="text-sm text-[var(--muted)]">No messages yet. Say hello.</p>
                  )}
                </div>
                <textarea
                  className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type a message"
                />
                <Button
                  className="w-full"
                  disabled={!body.trim() || send.isPending}
                  onClick={() => send.mutate()}
                >
                  Send
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
