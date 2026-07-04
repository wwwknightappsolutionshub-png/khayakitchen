import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BackendPageProps {
  children: ReactNode;
  className?: string;
}

/** Root wrapper for admin / platform pages — prevents horizontal overflow on mobile. */
export function BackendPage({ children, className }: BackendPageProps) {
  return (
    <div className={cn("backend-page animate-fade-in min-w-0 max-w-full w-full", className)}>
      {children}
    </div>
  );
}
