export interface ApiError {
  error: true;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  role: string;
  tenant_id: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MealOption {
  id: string;
  name: string;
  price_delta: number | string;
}

export interface MealOptionGroup {
  group: string;
  type?: string;
  items?: string[];
  options: MealOption[];
}

export interface Meal {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  base_price: number | string;
  is_active?: boolean;
  options: MealOptionGroup[];
}

export interface AdminOptionGroup {
  id: string;
  meal_id: string;
  name: string;
  type: "single" | "multiple";
  options?: AdminMealOption[];
}

export interface AdminMealOption {
  id: string;
  option_group_id: string;
  name: string;
  price_delta: number | string;
  is_active?: boolean;
}

export interface AdminMeal {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  base_price: number | string;
  is_active: boolean;
  option_groups?: AdminOptionGroup[];
}

export interface MenuResponse {
  meals: Meal[];
}

export interface OrderItemPayload {
  meal_id: string;
  quantity: number;
  options?: { option_id: string }[];
}

export interface CreateOrderPayload {
  customer_id?: string;
  order_type: "pickup" | "delivery";
  address?: string;
  scheduled_time?: string;
  items: OrderItemPayload[];
}

export interface CreateOrderResponse {
  order_id: string;
  status: string;
  total: number;
}

export interface Order {
  id: string;
  customer_id?: string;
  status: string;
  order_type: string;
  scheduled_time?: string;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  meal_id: string;
  quantity: number;
  base_price: number;
  final_price: number;
  meal?: { name: string };
  options?: { option_id: string; price_delta?: number; option?: { id: string; name: string } }[];
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number | string;
  reorder_level: number | string;
  cost_per_unit: number | string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  type: string;
  quantity: number | string;
  reference_type?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
}

export interface AuditLogEntry {
  id: string;
  tenant_id?: string;
  action: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profile?: CustomerProfile;
}

export interface DashboardKpis {
  revenue_today: number;
  orders_today: number;
  active_customers: number;
  low_stock_items: number;
}

export interface LoyaltyAccount {
  customer_id: string;
  points_balance: number;
  tier?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export type FeatureFlags = Record<string, boolean>;

export type ModuleStatus = "completed" | "in-progress" | "coming-soon" | "disabled";

export interface PlatformModule {
  id: string;
  key: string;
  name: string;
  status: ModuleStatus;
  enabled: boolean;
  description?: string | null;
  sort_order: number;
}

export interface PlatformDashboardOverview {
  total_tenants: number;
  active_tenants: number;
  total_orders: number;
  system_health: string;
  modules_completed_pct: number;
  modules_completed: number;
  modules_total: number;
}

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at?: string;
}

export interface PlatformTenantFlags {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_status: string;
  flags: Record<string, boolean>;
}

export interface PricingPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  is_active?: boolean;
  is_visible?: boolean;
  max_menu_items: number;
  max_orders_per_day: number;
  max_customers: number;
  features?: PricingFeature[];
}

export interface PricingFeature {
  id?: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  pivot?: { enabled: boolean };
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  ends_at?: string;
  plan?: PricingPlan;
  tenant?: PlatformTenant;
}

export interface Entitlements {
  flags: Record<string, boolean>;
  limits?: {
    max_menu_items: number;
    max_orders_per_day: number;
    max_customers: number;
  };
}

export type RestaurantOperationalStatus = "open" | "closing_soon" | "closed" | "promo_mode";

export interface TenantBranding {
  restaurant_name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  banner_image?: string | null;
  ticker_enabled?: boolean;
  ticker_text?: string | null;
  has_platform_override?: boolean;
}

export interface PlatformSettings {
  app_name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  splash_enabled: boolean;
  splash_headline?: string | null;
  splash_subheadline?: string | null;
  splash_image_url?: string | null;
  ticker_enabled: boolean;
  ticker_text?: string | null;
}

export interface RestaurantStatus {
  status: RestaurantOperationalStatus;
  is_accepting_orders: boolean;
  promo_alerts_enabled: boolean;
}

export interface Storefront {
  branding: TenantBranding;
  status: RestaurantStatus;
}

export interface CartItem {
  mealId: string;
  mealName: string;
  basePrice: number;
  quantity: number;
  selectedOptions: { optionId: string; name: string; priceDelta: number }[];
}

export interface NotificationCampaign {
  id: string;
  title: string;
  message: string;
  type: "promo" | "announcement" | "info";
  channel: "pwa" | "whatsapp" | "both";
  status: "draft" | "scheduled" | "sent";
  target_audience: "all" | "repeat_customers" | "active_customers";
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  sent_at?: string;
}

export interface CrmInsights {
  total_customers: number;
  returning_customers: number;
  loyal_customers: number;
  average_order_value: number;
  top_customers: {
    id: string;
    name: string;
    total_spent: number;
    order_count: number;
    segment: string;
  }[];
}

export interface CustomerProfile {
  total_spent?: number;
  total_orders?: number;
  order_count?: number;
  last_order_at?: string;
  last_order_date?: string;
  average_order_value?: number;
  visit_frequency_score?: number;
  is_loyal?: boolean;
  segment?: string;
}
