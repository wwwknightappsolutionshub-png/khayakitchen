"use client";

import dynamic from "next/dynamic";

const ReportsContent = dynamic(
  () => import("./ReportsContent").then((m) => m.ReportsContent),
  {
    ssr: false,
    loading: () => (
      <div className="animate-fade-in p-8 text-center text-muted">Loading reports…</div>
    ),
  },
);

export default function ReportsPage() {
  return <ReportsContent />;
}
