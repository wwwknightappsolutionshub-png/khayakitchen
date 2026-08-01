"use client";

import dynamic from "next/dynamic";

import { BackendPage } from "@/components/shared/BackendPage";

const ReportsContent = dynamic(
  () => import("./ReportsContent").then((m) => m.ReportsContent),
  {
    ssr: false,
    loading: () => (
      <BackendPage className="p-8 text-center text-muted">Loading reports…</BackendPage>
    ),
  },
);

export default function ReportsPage() {
  return <ReportsContent />;
}
