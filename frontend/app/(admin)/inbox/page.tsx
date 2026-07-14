"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackendPage } from "@/components/shared/BackendPage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { engagementService } from "@/services/engagement.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useChatTyping, useTypingPublisher } from "@/hooks/useChatTyping";

export default function TenantInboxPage() {
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listPoll = useHybridInterval(4_000, 10_000);
  const threadPoll = useHybridInterval(2_500, 8_000);
  const remoteTyping = useChatTyping(activeThreadId, ["tenant_user"]);

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

  const post = useMutation({
    mutationFn: () => engagementService.postTenantChatMessage(activeThreadId!, body),
    onSuccess: () => {
      setBody("");
      onCompose(false);
      queryClient.invalidateQueries({ queryKey: ["engagement", "thread", activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ["engagement", "customer-threads"] });
      queryClient.invalidateQueries({ queryKey: ["engagement", "platform-threads"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const messages = useMemo(() => thread.data?.thread.messages ?? [], [thread.data]);

  return (
    <BackendPage>
      <header className="backend-header">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted">Platform messages and customer chat · live updates</p>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
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
              </div>
            ))}
            {(platformMessages.data?.messages ?? []).length === 0 && (
              <p className="text-sm text-muted">No platform messages yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs font-medium text-muted">With platform</p>
            {(platformThreads.data?.threads ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                className="block w-full rounded-lg border border-border p-2 text-left text-sm"
                onClick={() => setActiveThreadId(t.id)}
              >
                {t.subject || "Platform chat"}
              </button>
            ))}
            <p className="pt-2 text-xs font-medium text-muted">With customers</p>
            {(customerThreads.data?.threads ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                className="block w-full rounded-lg border border-border p-2 text-left text-sm"
                onClick={() => setActiveThreadId(t.id)}
              >
                {t.subject || t.customer_id?.slice(0, 8)}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {activeThreadId && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-surface-elevated p-2 text-sm">
                  <p className="text-xs text-muted">{m.sender_label || m.sender_type}</p>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
            {remoteTyping && (
              <p className="text-xs italic text-muted">{remoteTyping.actor_label} is typing…</p>
            )}
            <textarea
              className="min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                onCompose(e.target.value.trim().length > 0);
              }}
            />
            <Button disabled={!body || post.isPending} onClick={() => post.mutate()}>
              Reply
            </Button>
          </CardContent>
        </Card>
      )}
    </BackendPage>
  );
}
