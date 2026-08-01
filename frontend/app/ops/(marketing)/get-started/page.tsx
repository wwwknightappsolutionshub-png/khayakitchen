import type { Metadata } from "next";
import { GetStartedClientShell } from "@/components/marketing/GetStartedClientShell";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://khayaos.prohost.cloud"
).replace(/\/$/, "");

const OG_PATH = "/og-get-started.jpg";
const OG_IMAGE = `${SITE_URL}${OG_PATH}`;

export const metadata: Metadata = {
  title: "KhayaOS — Kitchen operating system for food businesses",
  description:
    "Orders, kitchen display, inventory, loyalty, campaigns, and revenue recovery in one workspace. Start free on KhayaOS.",
  alternates: {
    canonical: `${SITE_URL}/ops/get-started`,
  },
  openGraph: {
    title: "KhayaOS — The kitchen operating system for food businesses",
    description:
      "Own your customers and run orders, prep, inventory, and growth in one place — not rented marketplace traffic.",
    url: `${SITE_URL}/ops/get-started`,
    siteName: "KhayaOS",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "KhayaOS — kitchen operating system for food businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KhayaOS — The kitchen operating system for food businesses",
    description:
      "Orders, kitchen, inventory, loyalty, and revenue recovery — one workspace you own.",
    images: [OG_IMAGE],
  },
};

export default function GetStartedPage() {
  return <GetStartedClientShell />;
}
