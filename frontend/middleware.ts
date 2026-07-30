import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NO_STORE_PATHS = /^\/($|menu|cart|account|checkout|payment-confirmation|tracking|reset-app|home|login|forgot-password|reset-password|verify-email|admin|orders|accounts|kitchen|inventory|crm|loyalty|inbox|reviews|seasonal-promo|marketing|revenue-recovery|branding|reports|staff-performance|settings|platform)/;

export function middleware(request: NextRequest) {
  if (!NO_STORE_PATHS.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    "/",
    "/menu",
    "/cart",
    "/account",
    "/checkout",
    "/payment-confirmation",
    "/tracking",
    "/reset-app",
    "/home",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/admin/:path*",
    "/orders",
    "/accounts",
    "/kitchen",
    "/inventory",
    "/crm",
    "/loyalty",
    "/inbox",
    "/reviews",
    "/seasonal-promo",
    "/marketing",
    "/revenue-recovery",
    "/branding",
    "/reports",
    "/staff-performance",
    "/settings",
    "/platform/:path*",
  ],
};
