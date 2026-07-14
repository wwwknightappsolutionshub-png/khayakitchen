/** Shared urgency siren + vibration for new orders and customer chat. */

export function playSirenTone(cycles = 3): void {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

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
