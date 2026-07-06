"use client";

import { useEffect } from "react";
import { hardResetPwa } from "@/lib/pwa";

export default function ResetAppPage() {
  useEffect(() => {
    void hardResetPwa();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F10] px-6 text-center text-white">
      <div>
        <p className="text-lg font-semibold">Updating Khaya Kitchen…</p>
        <p className="mt-2 text-sm text-zinc-400">Clearing cached app data and reloading.</p>
      </div>
    </div>
  );
}
