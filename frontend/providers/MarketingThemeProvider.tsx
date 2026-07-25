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
  MARKETING_THEME_STORAGE_KEY,
  marketingThemes,
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

function readStoredMode(): MarketingThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    return parseMarketingThemeMode(window.localStorage.getItem(MARKETING_THEME_STORAGE_KEY)) ?? "dark";
  } catch {
    return "dark";
  }
}

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MarketingThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setModeState(readStoredMode());
    setReady(true);
  }, []);

  const setMode = useCallback((next: MarketingThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(MARKETING_THEME_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
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
      mode: "dark",
      theme: marketingThemes.dark,
      setMode: () => undefined,
      toggle: () => undefined,
      ready: false,
    };
  }
  return ctx;
}
