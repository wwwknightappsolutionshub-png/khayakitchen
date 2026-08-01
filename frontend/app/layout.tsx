import type { Metadata, Viewport } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Anek_Latin, Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ThemeBoot } from "@/components/shared/ThemeBoot";
import { AuthHydration } from "@/components/shared/AuthHydration";
import { PwaBootGate } from "@/components/shared/PwaBootGate";
import { PwaLifecycle } from "@/components/shared/PwaLifecycle";
import { WrongSurfaceBanner } from "@/components/shared/WrongSurfaceBanner";
import { ChunkLoadRecovery } from "@/components/shared/ChunkLoadRecovery";
import { getBuildId } from "@/lib/build-id";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const anekLatin = Anek_Latin({
  variable: "--font-anek",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KhayaOS",
    template: "%s | KhayaOS",
  },
  description: "Business Operating System for Food Businesses",
  // Neutral defaults — route groups override with Order vs Ops identity.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KhayaOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  noStore();
  const buildId = getBuildId();

  return (
    <html
      lang="en"
      data-theme="light"
      data-build={buildId}
      className={`${anekLatin.variable} ${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <PwaBootGate buildId={buildId} />
      </head>
      <body className="min-h-full">
        <QueryProvider>
          <ToastProvider>
            <ThemeBoot />
            <PwaLifecycle />
            <WrongSurfaceBanner />
            <ChunkLoadRecovery />
            <AuthHydration>{children}</AuthHydration>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
