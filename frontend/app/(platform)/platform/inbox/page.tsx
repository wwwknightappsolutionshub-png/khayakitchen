"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { engagementService } from "@/services/engagement.service";
import { platformService } from "@/services/platform.service";

export default function PlatformInboxPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"messages" | "chat">("messages");
  const [tenantId, setTenantId] = useState("");
  const [channel, setChannel] = useState<"email" | "push">("email");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatBody, setChatBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tenants = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => platformService.getTenants(),
  });

  const messages = useQuery({
    queryKey: ["platform", "messages", tenantId],
    queryFn: () => engagementService.listPlatformMessages(tenantId || undefined),
  });

  const threads = useQuery({
    queryKey: ["platform", "chat-threads", tenantId],
    queryFn: () => engagementService.listPlatformChatThreads(tenantId || undefined),
  });

  const thread = useQuery({
    queryKey: ["platform", "chat", activeThreadId],
    queryFn: () => engagementService.getPlatformChat(activeThreadId!),
    enabled: !!activeThreadId,
  });

  const sendMessage = useMutation({
    mutationFn: () =>
      engagementService.sendPlatformMessage({
        tenant_id: tenantId,
        channel,
        title,
        body,
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["platform", "messages"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const openChat = useMutation({
    mutationFn: () => engagementService.openPlatformChat(tenantId, "Platform support"),
    onSuccess: (res) => {
      setActiveThreadId(res.thread.id);
      queryClient.invalidateQueries({ queryKey: ["platform", "chat-threads"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const postChat = useMutation({
    mutationFn: () => engagementService.postPlatformChatMessage(activeThreadId!, chatBody),
    onSuccess: () => {
      setChatBody("");
      queryClient.invalidateQueries({ queryKey: ["platform", "chat", activeThreadId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const tenantList = tenants.data?.tenants ?? [];

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-violet-100">Platform Inbox</h1>
        <p className="text-sm text-violet-300/70">
          Push, email, and chat with tenants (Owner / Admin / Support)
        </p>
      </header>

      <div className="flex gap-2">
        <Button variant={tab === "messages" ? "primary" : "secondary"} onClick={() => setTab("messages")}>
          Messages
        </Button>
        <Button variant={tab === "chat" ? "primary" : "secondary"} onClick={() => setTab("chat")}>
          Chat
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card className="border-violet-500/20 bg-[#0f1218]">
        <CardContent className="space-y-3 py-4">
          <label className="block text-sm text-violet-200">
            Tenant
            <select
              className="mt-1 w-full rounded-lg border border-violet-500/30 bg-[#0a0c10] px-3 py-2 text-violet-100"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">Select tenant</option>
              {tenantList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {tab === "messages" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-violet-500/20 bg-[#0f1218]">
            <CardHeader>
              <CardTitle className="text-violet-100">Send to tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="w-full rounded-lg border border-violet-500/30 bg-[#0a0c10] px-3 py-2 text-violet-100"
                value={channel}
                onChange={(e) => setChannel(e.target.value as "email" | "push")}
              >
                <option value="email">Email</option>
                <option value="push">Push</option>
              </select>
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                className="min-h-28 w-full rounded-lg border border-violet-500/30 bg-[#0a0c10] px-3 py-2 text-violet-100"
                placeholder="Message body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <Button
                disabled={!tenantId || !title || !body || sendMessage.isPending}
                onClick={() => sendMessage.mutate()}
              >
                Send
              </Button>
            </CardContent>
          </Card>
          <Card className="border-violet-500/20 bg-[#0f1218]">
            <CardHeader>
              <CardTitle className="text-violet-100">Recent sends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(messages.data?.messages ?? []).map((m) => (
                <div key={m.id} className="rounded-lg border border-violet-500/20 p-3 text-sm text-violet-100">
                  <p className="font-medium">
                    [{m.channel}] {m.title}
                  </p>
                  <p className="text-violet-300/70">{m.body}</p>
                  <p className="text-xs capitalize text-violet-400">{m.status}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "chat" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-violet-500/20 bg-[#0f1218]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-violet-100">Threads</CardTitle>
              <Button size="sm" disabled={!tenantId || openChat.isPending} onClick={() => openChat.mutate()}>
                Open / create
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(threads.data?.threads ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="block w-full rounded-lg border border-violet-500/20 p-3 text-left text-sm text-violet-100 hover:bg-violet-500/10"
                  onClick={() => setActiveThreadId(t.id)}
                >
                  {t.subject || t.id.slice(0, 8)}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card className="border-violet-500/20 bg-[#0f1218]">
            <CardHeader>
              <CardTitle className="text-violet-100">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {(thread.data?.thread.messages ?? []).map((m) => (
                  <div key={m.id} className="rounded-lg bg-violet-500/10 p-2 text-sm text-violet-100">
                    <p className="text-xs text-violet-300">{m.sender_label || m.sender_type}</p>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>
              <textarea
                className="min-h-20 w-full rounded-lg border border-violet-500/30 bg-[#0a0c10] px-3 py-2 text-violet-100"
                value={chatBody}
                onChange={(e) => setChatBody(e.target.value)}
                placeholder="Reply…"
              />
              <Button
                disabled={!activeThreadId || !chatBody || postChat.isPending}
                onClick={() => postChat.mutate()}
              >
                Send chat
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
