"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { engagementService } from "@/services/engagement.service";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const NAME_STORAGE_KEY = "khayaos-customer-name";
const THREAD_STORAGE_KEY = "khayaos-customer-chat-thread";

export function CustomerChatPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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

  const thread = useQuery({
    queryKey: ["customer-chat", threadId, phone],
    queryFn: () => engagementService.getCustomerChat(threadId!, phone.trim()),
    enabled: open && !!threadId && phone.trim().length > 0,
    refetchInterval: open ? 5000 : false,
  });

  const openChat = useMutation({
    mutationFn: () =>
      engagementService.openCustomerChat({
        phone: phone.trim(),
        name: name.trim() || undefined,
        subject: "Customer support",
      }),
    onSuccess: (res) => {
      localStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      if (name.trim()) localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      localStorage.setItem(THREAD_STORAGE_KEY, res.thread.id);
      setThreadId(res.thread.id);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["customer-chat", res.thread.id] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const send = useMutation({
    mutationFn: () => engagementService.postCustomerChatMessage(threadId!, phone.trim(), body),
    onSuccess: () => {
      setBody("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["customer-chat", threadId, phone] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) {
    return (
      <div className="mt-6">
        <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
          Chat with restaurant
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Chat with restaurant</h2>
        <button
          type="button"
          className="text-sm text-[var(--muted)]"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-rose-400">{error}</p>}

      {!threadId && (
        <div className="space-y-2">
          <input
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button
            className="w-full"
            disabled={!phone.trim() || openChat.isPending}
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
              <div key={m.id} className="rounded-xl bg-[var(--surface-elevated)] p-2 text-sm">
                <p className="text-xs text-[var(--muted)]">{m.sender_label || m.sender_type}</p>
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
  );
}
