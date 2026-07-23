/** Shared urgency siren + vibration for new orders, customer chat, and kitchen-ready. */

export type UrgencyReason = "chat" | "new_order" | "kitchen_ready";

const MUTE_KEY = "khayaos-urgency-alert-muted";
const LOOP_MS = 2800;

const activeReasons = new Set<UrgencyReason>();
let loopTimer: ReturnType<typeof setInterval> | null = null;
let unlocked = false;

export function isUrgencyMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setUrgencyMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  if (muted) {
    stopUrgencyLoop();
  } else {
    syncUrgencyLoop();
  }
}

/** Call from a click handler so browsers allow AudioContext. */
export function unlockUrgencyAudio(): void {
  unlocked = true;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    void ctx.resume().finally(() => {
      void ctx.close();
    });
  } catch {
    /* ignore */
  }
}

export function playSirenTone(cycles = 3): void {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    for (let i = 0; i < cycles; i++) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sawtooth";
      const start = now + i * 0.45;
      oscillator.frequency.setValueAtTime(720, start);
      oscillator.frequency.linearRampToValueAtTime(1180, start + 0.2);
      oscillator.frequency.linearRampToValueAtTime(720, start + 0.4);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.42);
    }

    window.setTimeout(() => {
      void ctx.close();
    }, cycles * 500 + 200);
  } catch {
    /* Autoplay may be blocked until unlockUrgencyAudio() */
  }
}

export function vibratePhoneUrgent(): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([300, 120, 300, 120, 300, 120, 500]);
  }
}

export function fireUrgencyAlert(): void {
  playSirenTone(4);
  vibratePhoneUrgent();
}

function syncUrgencyLoop(): void {
  if (typeof window === "undefined") return;

  const shouldRun = activeReasons.size > 0 && !isUrgencyMuted();

  if (!shouldRun) {
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(0);
    }
    return;
  }

  if (loopTimer) return;

  fireUrgencyAlert();
  loopTimer = setInterval(() => {
    if (activeReasons.size === 0 || isUrgencyMuted()) {
      stopUrgencyLoop();
      return;
    }
    fireUrgencyAlert();
  }, LOOP_MS);
}

export function stopUrgencyLoop(): void {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(0);
  }
}

/** Enable or clear a reason; loop runs while any reason is active and not muted. */
export function setUrgencyReason(reason: UrgencyReason, active: boolean): void {
  if (active) {
    activeReasons.add(reason);
  } else {
    activeReasons.delete(reason);
  }
  syncUrgencyLoop();
}

export function clearAllUrgencyReasons(): void {
  activeReasons.clear();
  stopUrgencyLoop();
}

export function getActiveUrgencyReasons(): UrgencyReason[] {
  return [...activeReasons];
}

export function hasActiveUrgencyReasons(): boolean {
  return activeReasons.size > 0;
}
