const CURRENCY_KEY = "khayaos_currency";
const THEME_KEY = "khayaos_ui_theme";

let activeCurrency = "";

export type UiTheme = "light" | "dark";

export function getActiveCurrency(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(CURRENCY_KEY);
    if (stored) activeCurrency = stored.toUpperCase();
  }
  return activeCurrency;
}

export function setActiveCurrency(currency: string | null | undefined): void {
  const next = (currency || "").trim().toUpperCase();
  if (!next) return;
  activeCurrency = next;
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENCY_KEY, next);
}

export function getStoredUiTheme(): UiTheme {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function applyUiTheme(theme: UiTheme): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  const customerRoot = document.querySelector(".customer-app");
  if (customerRoot instanceof HTMLElement) {
    customerRoot.setAttribute("data-theme", theme);
  }
}

export function applyWorkspaceRuntime(config: {
  currency?: string | null;
  ui_theme?: string | null;
}): void {
  if (config.currency) {
    setActiveCurrency(config.currency);
  }
  if (config.ui_theme === "dark" || config.ui_theme === "light") {
    applyUiTheme(config.ui_theme);
  }
}
