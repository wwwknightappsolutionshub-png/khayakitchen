"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MARKETING_THEME_HTML_ATTR,
  MARKETING_THEME_STORAGE_KEY,
  marketingThemes,
  migrateMarketingThemeToLightDefault,
  parseMarketingThemeMode,
  type MarketingThemeMode,
  type MarketingThemeTokens,
} from "@/lib/marketing-theme";

type MarketingThemeContextValue = {
  mode: MarketingThemeMode;
  theme: MarketingThemeTokens;
  setMode: (mode: MarketingThemeMode) => void;
  toggle: () => void;
  ready: boolean;
};

const MarketingThemeContext = createContext<MarketingThemeContextValue | null>(null);

function readBootMode(): MarketingThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    // Idempotent: first visit after deploy forces light even if legacy dark was stored.
    migrateMarketingThemeToLightDefault();
    const fromHtml = parseMarketingThemeMode(
      document.documentElement.getAttribute(MARKETING_THEME_HTML_ATTR),
    );
    if (fromHtml) return fromHtml;
    return (
      parseMarketingThemeMode(window.localStorage.getItem(MARKETING_THEME_STORAGE_KEY)) ?? "light"
    );
  } catch {
    return "light";
  }
}

function writeBootMode(mode: MarketingThemeMode) {
  if (typeof window === "undefined") return;
  try {
    document.documentElement.setAttribute(MARKETING_THEME_HTML_ATTR, mode);
    window.localStorage.setItem(MARKETING_THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  // SSR defaults light; useLayoutEffect aligns to boot script / localStorage before paint.
  const [mode, setModeState] = useState<MarketingThemeMode>("light");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const next = readBootMode();
    setModeState(next);
    writeBootMode(next);
    setReady(true);
  }, []);

  const setMode = useCallback((next: MarketingThemeMode) => {
    setModeState(next);
    writeBootMode(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      theme: marketingThemes[mode],
      setMode,
      toggle,
      ready,
    }),
    [mode, setMode, toggle, ready],
  );

  return (
    <MarketingThemeContext.Provider value={value}>{children}</MarketingThemeContext.Provider>
  );
}

export function useMarketingTheme(): MarketingThemeContextValue {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) {
    return {
      mode: "light",
      theme: marketingThemes.light,
      setMode: () => undefined,
      toggle: () => undefined,
      ready: false,
    };
  }
  return ctx;
}
