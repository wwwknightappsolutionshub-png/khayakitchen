"use client";

import { useEffect } from "react";

/**
 * Auth screens always paint light so a stored dark platform theme cannot make
 * the sign-in card look empty against a charcoal background.
 * Does not persist — ThemeBoot / workspace sync restore preference after login.
 */
export function AuthThemeForce() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  return null;
}
