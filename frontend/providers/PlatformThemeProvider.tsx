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
  PLATFORM_THEME_ATTR,
  platformThemes,
  readStoredPlatformTheme,
  writeStoredPlatformTheme,
  type PlatformThemeChrome,
  type PlatformThemeMode,
} from "@/lib/platform-theme";

type PlatformThemeContextValue = {
  mode: PlatformThemeMode;
  chrome: PlatformThemeChrome;
  setMode: (mode: PlatformThemeMode) => void;
  toggle: () => void;
  ready: boolean;
};

const PlatformThemeContext = createContext<PlatformThemeContextValue | null>(null);

function restoreHtmlTheme(previous: string | null) {
  const html = document.documentElement;
  html.removeAttribute(PLATFORM_THEME_ATTR);
  if (previous) {
    html.setAttribute("data-theme", previous);
    return;
  }
  try {
    const tenant = window.localStorage.getItem("khayaos_ui_theme");
    if (tenant === "light" || tenant === "dark") {
      html.setAttribute("data-theme", tenant);
      return;
    }
  } catch {
    /* ignore */
  }
  html.setAttribute("data-theme", "light");
}

export function PlatformThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PlatformThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const previous = html.getAttribute("data-theme");
    const next = readStoredPlatformTheme();
    setModeState(next);
    html.setAttribute("data-theme", next);
    html.setAttribute(PLATFORM_THEME_ATTR, next);
    writeStoredPlatformTheme(next);
    setReady(true);

    return () => restoreHtmlTheme(previous);
  }, []);

  const setMode = useCallback((next: PlatformThemeMode) => {
    setModeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.setAttribute(PLATFORM_THEME_ATTR, next);
    }
    writeStoredPlatformTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      chrome: platformThemes[mode],
      setMode,
      toggle,
      ready,
    }),
    [mode, setMode, toggle, ready],
  );

  return (
    <PlatformThemeContext.Provider value={value}>{children}</PlatformThemeContext.Provider>
  );
}

export function usePlatformTheme(): PlatformThemeContextValue {
  const ctx = useContext(PlatformThemeContext);
  if (!ctx) {
    return {
      mode: "dark",
      chrome: platformThemes.dark,
      setMode: () => undefined,
      toggle: () => undefined,
      ready: false,
    };
  }
  return ctx;
}
