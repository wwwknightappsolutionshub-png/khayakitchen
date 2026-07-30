import { Suspense } from "react";
import PaymentConfirmationPage from "./PaymentConfirmationPage";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 px-4 pt-6">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-40 w-full" />
        </div>
      }
    >
      <PaymentConfirmationPage />
    </Suspense>
  );
}
