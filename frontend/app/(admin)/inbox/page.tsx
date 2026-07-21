"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { engagementService } from "@/services/engagement.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useChatTyping, useTypingPublisher } from "@/hooks/useChatTyping";
import { cn, formatDate } from "@/lib/utils";
import type { ChatMessage, ChatThread } from "@/lib/types";

function initials(name?: string | null): string {
  const parts = (name || "G").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "G";
}

function formatShortTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
    }
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
  } catch {
    return "";
  }
}

function ThreadRow({
  thread,
  active,
  onSelect,
  fallbackLabel,
}: {
  thread: ChatThread;
  active: boolean;
  onSelect: () => void;
  fallbackLabel: string;
}) {
  const title =
    thread.customer_name ||
    thread.subject ||
    fallbackLabel;
  const preview = thread.last_message_preview?.trim() || "No messages yet";
  const unread = thread.unread_count ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-surface hover:bg-surface-elevated",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          active ? "bg-primary text-white" : "bg-surface-elevated text-muted",
        )}
      >
        {initials(title)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          <span className="shrink-0 text-[10px] text-muted">
            {formatShortTime(thread.last_message_at || thread.updated_at)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="line-clamp-1 text-xs text-muted">{preview}</span>
          {unread > 0 && (
            <span className="shrink-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        {thread.customer_phone && (
          <span className="mt-0.5 block truncate text-[10px] text-muted">{thread.customer_phone}</span>
        )}
      </span>
    </button>
  );
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
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          mine
            ? "rounded-br-md bg-primary text-white"
            : "rounded-bl-md border border-border bg-surface-elevated text-foreground",
        )}
      >
        {!mine && (
          <p className="mb-0.5 text-[11px] font-medium text-muted">
            {message.sender_label || message.sender_type}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words leading-snug">{message.body}</p>
        <p className={cn("mt-1 text-right text-[10px]", mine ? "text-white/75" : "text-muted")}>
          {formatShortTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function TenantInboxPage() {
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listPoll = useHybridInterval(4_000, 10_000);
  const threadPoll = useHybridInterval(2_500, 8_000);
  const remoteTyping = useChatTyping(activeThreadId, ["tenant_user"]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const publishTyping = useCallback(
    (isTyping: boolean) => {
      if (!activeThreadId) return;
      return engagementService.setTenantChatTyping(activeThreadId, isTyping);
    },
    [activeThreadId],
  );
  const onCompose = useTypingPublisher(!!activeThreadId, publishTyping);

  const platformMessages = useQuery({
    queryKey: ["engagement", "platform-messages"],
    queryFn: () => engagementService.listTenantPlatformMessages(),
    refetchInterval: listPoll,
  });

  const platformThreads = useQuery({
    queryKey: ["engagement", "platform-threads"],
    queryFn: () => engagementService.listTenantPlatformThreads(),
    refetchInterval: listPoll,
  });

  const customerThreads = useQuery({
    queryKey: ["engagement", "customer-threads"],
    queryFn: () => engagementService.listTenantCustomerThreads(),
    refetchInterval: listPoll,
  });

  const thread = useQuery({
    queryKey: ["engagement", "thread", activeThreadId],
    queryFn: () => engagementService.getTenantChat(activeThreadId!),
    enabled: !!activeThreadId,
    refetchInterval: threadPoll,
  });

  useEffect(() => {
    if (!thread.data) return;
    setError(null);
    queryClient.invalidateQueries({ queryKey: ["engagement", "notification-badges"] });
  }, [thread.data, queryClient]);

  const post = useMutation({
    mutationFn: () => {
      setError(null);
      return engagementService.postTenantChatMessage(activeThreadId!, body);
    },
    onSuccess: () => {
      setBody("");
      onCompose(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["engagement", "thread", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["engagement", "customer-threads"] });
      queryClient.invalidateQueries({ queryKey: ["engagement", "platform-threads"] });
      queryClient.invalidateQueries({ queryKey: ["engagement", "notification-badges"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      void queryClient
        .invalidateQueries({ queryKey: ["engagement", "thread", activeThreadId] })
        .then(() => setError(null));
    },
  });

  const openThread = (id: string) => {
    setActiveThreadId(id);
    setError(null);
    queryClient.invalidateQueries({ queryKey: ["engagement", "notification-badges"] });
    queryClient.invalidateQueries({ queryKey: ["engagement", "customer-threads"] });
  };

  const messages = useMemo(() => thread.data?.thread.messages ?? [], [thread.data]);
  const activeMeta = useMemo(() => {
    const all = [
      ...(platformThreads.data?.threads ?? []),
      ...(customerThreads.data?.threads ?? []),
    ];
    return all.find((t) => t.id === activeThreadId) ?? thread.data?.thread ?? null;
  }, [activeThreadId, platformThreads.data, customerThreads.data, thread.data]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length, remoteTyping, activeThreadId]);

  const conversationTitle =
    activeMeta?.customer_name || activeMeta?.subject || "Conversation";

  return (
    <BackendPage>
      <header className="backend-header">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted">Platform messages and customer chat · live updates</p>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Platform notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(platformMessages.data?.messages ?? []).map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">
                [{m.channel}] {m.title}
              </p>
              <p className="text-muted">{m.body}</p>
              {m.created_at && (
                <p className="mt-1 text-[10px] text-muted">{formatDate(m.created_at)}</p>
              )}
            </div>
          ))}
          {(platformMessages.data?.messages ?? []).length === 0 && (
            <p className="text-sm text-muted">No platform messages yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid h-[min(70vh,720px)] overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Chats</p>
            <p className="text-xs text-muted">Select a conversation</p>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            <div>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                With platform
              </p>
              <div className="space-y-2">
                {(platformThreads.data?.threads ?? []).map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    active={activeThreadId === t.id}
                    onSelect={() => openThread(t.id)}
                    fallbackLabel="Platform chat"
                  />
                ))}
                {(platformThreads.data?.threads ?? []).length === 0 && (
                  <p className="px-1 text-xs text-muted">No platform chats</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                With customers
              </p>
              <div className="space-y-2">
                {(customerThreads.data?.threads ?? []).map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    active={activeThreadId === t.id}
                    onSelect={() => openThread(t.id)}
                    fallbackLabel="Customer"
                  />
                ))}
                {(customerThreads.data?.threads ?? []).length === 0 && (
                  <p className="px-1 text-xs text-muted">No customer chats yet</p>
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[280px] flex-col overflow-hidden lg:min-h-0">
          {!activeThreadId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted" />
              <p className="font-medium">No conversation selected</p>
              <p className="max-w-sm text-sm text-muted">
                Pick a customer or platform chat from the list to reply in real time.
              </p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials(conversationTitle)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{conversationTitle}</p>
                  <p className="truncate text-xs text-muted">
                    {remoteTyping
                      ? `${remoteTyping.actor_label} is typing…`
                      : activeMeta?.customer_phone ||
                        (activeMeta?.type === "platform_tenant" ? "Platform support" : "Customer chat")}
                  </p>
                </div>
              </div>

              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-surface-elevated/40 px-4 py-4"
              >
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    mine={m.sender_type === "tenant_user"}
                  />
                ))}
                {messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted">No messages in this thread yet.</p>
                )}
              </div>

              <div className="shrink-0 border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
                    value={body}
                    rows={2}
                    onChange={(e) => {
                      setBody(e.target.value);
                      onCompose(e.target.value.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (body.trim() && !post.isPending) post.mutate();
                      }
                    }}
                    placeholder="Write a reply…"
                  />
                  <Button
                    className="h-11 shrink-0 gap-1.5"
                    disabled={!body.trim() || post.isPending}
                    onClick={() => post.mutate()}
                  >
                    <Send className="h-4 w-4" />
                    Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </BackendPage>
  );
}
