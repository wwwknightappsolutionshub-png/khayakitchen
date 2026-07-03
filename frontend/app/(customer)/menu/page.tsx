import { Suspense } from "react";
import MenuPage from "./MenuPage";

function MenuSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="customer-shimmer aspect-video w-full" />
          <div className="space-y-2 p-4">
            <div className="customer-shimmer h-5 w-2/3 rounded" />
            <div className="customer-shimmer h-4 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuPage />
    </Suspense>
  );
}
