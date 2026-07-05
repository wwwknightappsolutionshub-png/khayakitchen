import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  ChefHat,
  ClipboardList,
  Crown,
  Gift,
  LayoutDashboard,
  Leaf,
  Megaphone,
  Package,
  Rocket,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export interface KhayaFeature {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface KhayaFeatureSlide {
  id: string;
  title: string;
  subtitle: string;
  features: KhayaFeature[];
}

/** Wizard order: Operations → Customer → Growth → Platform (signup is step 5). */
export const KHAYA_FEATURE_SLIDES: KhayaFeatureSlide[] = [
  {
    id: "operations",
    title: "Kitchen Operations",
    subtitle: "Run service end-to-end — orders, inventory, kitchen, menu, and delivery.",
    features: [
      {
        key: "orders",
        title: "Order pipeline",
        description: "Pickup and delivery orders from placement through completion with realtime updates.",
        icon: ClipboardList,
      },
      {
        key: "inventory",
        title: "Inventory & recipes",
        description: "Stock levels, reorder alerts, and recipe-linked depletion.",
        icon: Package,
      },
      {
        key: "kitchen",
        title: "Kitchen display",
        description: "Prep queue workflow so your team sees what to cook next.",
        icon: Zap,
      },
      {
        key: "menu_management",
        title: "Menu management",
        description: "Meals, options, pricing, images, and availability with plan-aware limits.",
        icon: ChefHat,
      },
      {
        key: "delivery",
        title: "Delivery zones",
        description: "Zone-based delivery with driver-ready order routing.",
        icon: Truck,
      },
    ],
  },
  {
    id: "customer",
    title: "Customer Experience",
    subtitle: "Mobile-first ordering that keeps guests coming back.",
    features: [
      {
        key: "pwa_ordering",
        title: "PWA online ordering",
        description: "Installable customer app with fast menu browsing, cart, and checkout.",
        icon: Smartphone,
      },
      {
        key: "crm",
        title: "Customer CRM",
        description: "Profiles, segments, order history, and returning-customer insights.",
        icon: Users,
      },
      {
        key: "loyalty",
        title: "Loyalty program",
        description: "Points, rewards, and repeat-visit incentives built into ordering.",
        icon: Gift,
      },
      {
        key: "tracking",
        title: "Order tracking",
        description: "Live status updates from kitchen to pickup or delivery.",
        icon: ShoppingBag,
      },
      {
        key: "whatsapp",
        title: "WhatsApp updates",
        description: "Optional WhatsApp notifications for order progress.",
        icon: Bell,
      },
    ],
  },
  {
    id: "growth",
    title: "Growth & Revenue",
    subtitle: "Promotions, campaigns, and recovery tools that turn slow periods into sales.",
    features: [
      {
        key: "promo_mode",
        title: "Promo mode & timers",
        description: "Live restaurant status promos with countdowns and discounted meal picks.",
        icon: Megaphone,
      },
      {
        key: "campaigns",
        title: "Notification campaigns",
        description: "Push and WhatsApp campaigns targeted by audience segments.",
        icon: Bell,
      },
      {
        key: "revenue_recovery",
        title: "Revenue recovery",
        description: "Time-limited recovery campaigns with analytics and automatic pricing.",
        icon: Leaf,
      },
      {
        key: "coupons",
        title: "Coupons & discounts",
        description: "Checkout discounts applied consistently across cart and orders.",
        icon: Wallet,
      },
      {
        key: "reports",
        title: "Reports & analytics",
        description: "Operational reports, recovery metrics, and plan usage visibility.",
        icon: BarChart3,
      },
      {
        key: "enterprise",
        title: "Enterprise scale",
        description: "API access, white-label options, and dedicated support on higher tiers.",
        icon: Rocket,
      },
    ],
  },
  {
    id: "platform",
    title: "KhayaOS Platform",
    subtitle: "One operating system for your entire food business — from first order to repeat revenue.",
    features: [
      {
        key: "multi_tenant",
        title: "Multi-tenant workspaces",
        description: "Isolated restaurant environments with secure data boundaries and branded storefronts.",
        icon: Store,
      },
      {
        key: "saas_plans",
        title: "SaaS plans & entitlements",
        description: "Feature access, usage limits, and upgrade paths managed per subscription plan.",
        icon: Crown,
      },
      {
        key: "branding",
        title: "Brand control",
        description: "Logo, colors, ticker, splash screen, and customer-facing identity in one place.",
        icon: LayoutDashboard,
      },
      {
        key: "dashboard",
        title: "Live dashboard",
        description: "Operational KPIs, sales pulse, and restaurant status at a glance.",
        icon: BarChart3,
      },
    ],
  },
];

export const WIZARD_STEP_LABELS = [
  "Operations",
  "Customer UX",
  "Growth",
  "Platform",
  "Sign up",
] as const;
