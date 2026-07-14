"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";

export type ChatTypingActor = {
  actor_type: string;
  actor_label: string;
};

/**
 * Tracks remote typing indicators for a chat thread via realtime events.
 * Ignores actors matching `selfActorTypes` so local keystrokes don't echo.
 */
export function useChatTyping(
  threadId: string | null,
  selfActorTypes: string[] = [],
): ChatTypingActor | null {
  const [typing, setTyping] = useState<ChatTypingActor | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfKey = selfActorTypes.join(",");

  const onEvent = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (event !== "ChatTyping" || !threadId) return;
      if ((payload.thread_id as string | undefined) !== threadId) return;

      const actorType = String(payload.actor_type ?? "");
      if (selfKey.split(",").filter(Boolean).includes(actorType)) return;

      if (clearTimer.current) clearTimeout(clearTimer.current);

      if (payload.is_typing) {
        setTyping({
          actor_type: actorType,
          actor_label: String(payload.actor_label ?? "Someone"),
        });
        clearTimer.current = setTimeout(() => setTyping(null), 4000);
      } else {
        setTyping(null);
      }
    },
    [threadId, selfKey],
  );

  useRealtimeEvent(onEvent);

  useEffect(() => {
    setTyping(null);
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, [threadId]);

  return typing;
}

/** Debounced typing pings while the local user is composing. */
export function useTypingPublisher(
  enabled: boolean,
  publish: (isTyping: boolean) => Promise<unknown> | void,
): (isComposing: boolean) => void {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(false);

  const flush = useCallback(
    (isTyping: boolean) => {
      if (!enabled) return;
      if (lastSent.current === isTyping) return;
      lastSent.current = isTyping;
      void Promise.resolve(publish(isTyping)).catch(() => {
        /* typing is best-effort */
      });
    },
    [enabled, publish],
  );

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (lastSent.current) {
        lastSent.current = false;
        void Promise.resolve(publish(false)).catch(() => undefined);
      }
    };
  }, [publish]);

  return useCallback(
    (isComposing: boolean) => {
      if (!enabled) return;
      if (idleTimer.current) clearTimeout(idleTimer.current);

      if (isComposing) {
        flush(true);
        idleTimer.current = setTimeout(() => flush(false), 2500);
      } else {
        flush(false);
      }
    },
    [enabled, flush],
  );
}
