import type { Metadata, Viewport } from "next";
import { Anek_Latin, Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AuthHydration } from "@/components/shared/AuthHydration";
import { PwaLifecycle } from "@/components/shared/PwaLifecycle";
import "./globals.css";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KhayaOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#121418",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anekLatin.variable} ${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <QueryProvider>
          <ToastProvider>
            <PwaLifecycle />
            <AuthHydration>{children}</AuthHydration>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
