export const SPLASH_COMPLETE_EVENT = "khayaos-splash-complete";

export function dispatchSplashComplete(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPLASH_COMPLETE_EVENT));
}
