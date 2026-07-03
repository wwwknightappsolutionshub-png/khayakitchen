"use client";

import { usePathname } from "next/navigation";
import { RestaurantStatusBanner } from "@/components/customer/RestaurantStatusBanner";

export function CustomerStatusLayer() {
  const pathname = usePathname();
  if (pathname === "/home" || pathname === "/") return null;
  return <RestaurantStatusBanner />;
}
