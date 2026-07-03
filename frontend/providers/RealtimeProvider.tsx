"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRealtimeClient, type RealtimeChannel } from "@/lib/realtime-client";
import { realtimeService } from "@/services/realtime.service";

type RealtimeMode = "websocket" | "polling";

interface RealtimeContextValue {
  isConnected: boolean;
  mode: RealtimeMode;
  isReconnecting: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  mode: "polling",
  isReconnecting: false,
});

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: ReactNode;
  channels: RealtimeChannel[];
  enabled?: boolean;
}

export function RealtimeProvider({
  children,
  channels,
  enabled = true,
}: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const client = useMemo(() => getRealtimeClient(), []);

  const invalidateForEvent = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      const orderId = payload.order_id as string | undefined;

      switch (event) {
        case "OrderCreated":
        case "OrderUpdated":
        case "OrderStatusChanged":
        case "OrderCancelled":
        case "NewKitchenTicket":
          queryClient.invalidateQueries({ queryKey: ["kitchen"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          if (orderId) {
            queryClient.invalidateQueries({ queryKey: ["order-tracking", orderId] });
          }
          break;
        case "RevenueUpdated":
        case "OrderCountUpdated":
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
          }, 500);
          break;
        default:
          break;
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let mounted = true;
    const token = localStorage.getItem("khayaos_token");
    const needsAuth = channels.some((c) => c !== "customer");
    if (needsAuth && !token) {
      return;
    }

    const unsubConnection = client.onConnectionChange((connected) => {
      if (!mounted) return;
      setIsConnected(connected);
      setIsReconnecting(!connected);
    });

    const unsubEvents = client.onEvent(invalidateForEvent);

    const loadConfig = needsAuth
      ? realtimeService.getConfig()
      : realtimeService.getPublicConfig();

    loadConfig
      .then((config) => client.connect(config, channels))
      .catch(() => {
        if (mounted) {
          setIsConnected(false);
          setIsReconnecting(true);
        }
      });

    return () => {
      mounted = false;
      unsubConnection();
      unsubEvents();
      client.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, channels, client, invalidateForEvent]);

  const mode: RealtimeMode = isConnected ? "websocket" : "polling";

  return (
    <RealtimeContext.Provider value={{ isConnected, mode, isReconnecting }}>
      {children}
    </RealtimeContext.Provider>
  );
}
