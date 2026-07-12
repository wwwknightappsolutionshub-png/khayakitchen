"use client";

import { useEffect } from "react";
import { applyUiTheme, getStoredUiTheme } from "@/lib/workspace-runtime";

/** Applies stored theme before paint settles; default is light. */
export function ThemeBoot() {
  useEffect(() => {
    applyUiTheme(getStoredUiTheme());
  }, []);

  return null;
}
