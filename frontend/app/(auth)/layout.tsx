import type { Metadata } from "next";
import { AuthThemeForce } from "@/components/shared/AuthThemeForce";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AuthThemeForce />
      {children}
    </div>
  );
}
