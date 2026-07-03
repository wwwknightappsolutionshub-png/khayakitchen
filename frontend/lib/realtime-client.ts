"use client";

import Pusher, { type Channel } from "pusher-js";
import type { RealtimeConfig } from "@/services/realtime.service";

export type RealtimeChannel = "admin" | "kitchen" | "customer";

export type RealtimeEventHandler = (event: string, payload: Record<string, unknown>) => void;

type ConnectionListener = (connected: boolean) => void;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("khayaos_token");
}

function getTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("khayaos_tenant_id") ?? process.env.NEXT_PUBLIC_TENANT_ID ?? null;
}

export class RealtimeClient {
  private pusher: Pusher | null = null;
  private channels = new Map<string, Channel>();
  private handlers = new Set<RealtimeEventHandler>();
  private connectionListeners = new Set<ConnectionListener>();
  private reconnectAttempt = 0;
  private config: RealtimeConfig | null = null;

  get isConnected(): boolean {
    return this.pusher?.connection.state === "connected";
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => this.connectionListeners.delete(listener);
  }

  onEvent(handler: RealtimeEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async connect(config: RealtimeConfig, channelTypes: RealtimeChannel[]): Promise<void> {
    this.config = config;
    this.disconnect();

    if (!config.key || config.driver === "null") {
      this.notifyConnection(false);
      return;
    }

    const token = getToken();
    const usePrivate = channelTypes.some((c) => c !== "customer");

    this.pusher = new Pusher(config.key, {
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: config.scheme === "wss" || config.scheme === "https",
      enabledTransports: ["ws", "wss"],
      cluster: "",
      disableStats: true,
      authEndpoint: usePrivate ? config.auth_endpoint : undefined,
      auth: usePrivate && token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        : undefined,
    });

    this.pusher.connection.bind("connected", () => {
      this.reconnectAttempt = 0;
      this.notifyConnection(true);
    });

    this.pusher.connection.bind("disconnected", () => {
      this.notifyConnection(false);
      this.scheduleReconnect(channelTypes);
    });

    this.pusher.connection.bind("unavailable", () => {
      this.notifyConnection(false);
    });

    this.pusher.connection.bind("failed", () => {
      this.notifyConnection(false);
      this.scheduleReconnect(channelTypes);
    });

    for (const type of channelTypes) {
      const channelName = config.channels[type];
      if (!channelName) continue;
      const pusherChannelName =
        type === "customer" ? channelName : `private-${channelName}`;

      const channel = this.pusher.subscribe(pusherChannelName);
      this.channels.set(type, channel);

      const events = [
        "OrderCreated",
        "OrderUpdated",
        "OrderStatusChanged",
        "OrderCancelled",
        "RevenueUpdated",
        "OrderCountUpdated",
        "NewKitchenTicket",
      ];

      for (const event of events) {
        channel.bind(event, (payload: Record<string, unknown>) => {
          this.handlers.forEach((h) => h(event, payload));
        });
      }
    }
  }

  disconnect(): void {
    this.channels.forEach((ch) => ch.unbind_all());
    this.channels.clear();
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.notifyConnection(false);
  }

  private notifyConnection(connected: boolean): void {
    this.connectionListeners.forEach((l) => l(connected));
  }

  private scheduleReconnect(channelTypes: RealtimeChannel[]): void {
    if (!this.config) return;
    const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    window.setTimeout(() => {
      if (this.config && !this.isConnected) {
        void this.connect(this.config, channelTypes);
      }
    }, delay);
  }
}

let singleton: RealtimeClient | null = null;

export function getRealtimeClient(): RealtimeClient {
  if (!singleton) singleton = new RealtimeClient();
  return singleton;
}

export function getTenantChannelPrefix(): string | null {
  const tenantId = getTenantId();
  return tenantId ? `tenant.${tenantId}` : null;
}
