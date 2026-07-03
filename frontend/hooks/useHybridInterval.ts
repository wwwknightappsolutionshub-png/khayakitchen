"use client";

import { useEffect, useState } from "react";
import { useRealtimeStatus } from "@/providers/RealtimeProvider";

export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}

export function useHybridInterval(activeMs: number, backgroundMs: number): number | false {
  const { isConnected, mode } = useRealtimeStatus();
  const visible = usePageVisibility();

  if (mode === "websocket" && isConnected) {
    return false;
  }

  return visible ? activeMs : backgroundMs;
}
