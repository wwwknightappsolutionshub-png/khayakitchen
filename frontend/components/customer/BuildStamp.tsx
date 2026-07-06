"use client";

import { useEffect, useState } from "react";

export function BuildStamp() {
  const [buildId, setBuildId] = useState("");

  useEffect(() => {
    setBuildId(document.documentElement.dataset.build?.slice(0, 8) ?? "?");
  }, []);

  if (!buildId) return null;

  return (
    <p
      className="pointer-events-none fixed bottom-20 right-2 z-[40] rounded bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-white/40"
      aria-hidden
    >
      {buildId}
    </p>
  );
}
