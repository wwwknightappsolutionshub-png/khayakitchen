"use client";

import { useEffect } from "react";
import { getRealtimeClient, type RealtimeEventHandler } from "@/lib/realtime-client";

export function useRealtimeEvent(handler: RealtimeEventHandler) {
  useEffect(() => {
    const client = getRealtimeClient();
    return client.onEvent(handler);
  }, [handler]);
}
