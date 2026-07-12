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
  tenant_slug?: string | null;
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
  discount_total?: number;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_channel?: string | null;
  status: string;
  order_type: string;
  scheduled_time?: string;
  total_amount: number;
  discount_total?: number;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  meal_id: string;
  quantity: number;
  base_price: number;
  final_price: number;
  discount_amount?: number;
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

export interface PlanDistribution {
  plan_id: string;
  plan_name: string;
  count: number;
}

export interface FeatureAdoption {
  key: string;
  name: string;
  plan_count: number;
}

export interface PlatformDashboardOverview {
  total_tenants: number;
  active_tenants: number;
  total_orders: number;
  system_health: string;
  modules_completed_pct: number;
  modules_completed: number;
  modules_total: number;
  mrr?: number;
  arr?: number;
  plan_distribution?: PlanDistribution[];
  upgrade_requests?: number;
  average_menu_count?: number;
  average_orders?: number;
  average_revenue?: number;
  feature_adoption?: FeatureAdoption[];
  expired_plans?: number;
  pending_renewals?: number;
  newest_tenants?: PlatformTenant[];
}

export interface PlatformBillingMetrics {
  mrr: number;
  arr: number;
  plan_distribution: PlanDistribution[];
  upgrade_requests: number;
  average_menu_count: number;
  expired_plans: number;
  pending_renewals: number;
  feature_adoption: FeatureAdoption[];
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

export const PLAN_LIMIT_KEYS = [
  "max_menu_items",
  "max_categories",
  "max_staff",
  "max_campaigns_per_month",
  "max_push_notifications_per_month",
  "max_storage_mb",
  "max_images",
  "max_branches",
  "max_drivers",
  "max_customers",
  "max_products",
  "max_loyalty_members",
  "max_active_promotions",
  "max_delivery_zones",
  "max_orders_per_day",
] as const;

export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

export type UnlimitedFlags = Partial<Record<PlanLimitKey, boolean>>;

export interface PricingPlan {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price_monthly: number;
  price_yearly: number;
  currency?: string;
  cta_text?: string | null;
  plan_color?: string | null;
  plan_icon?: string | null;
  is_active?: boolean;
  is_visible?: boolean;
  is_recommended?: boolean;
  display_order?: number;
  marketing_features?: string[];
  max_menu_items: number;
  max_orders_per_day: number;
  max_customers: number;
  max_categories?: number;
  max_staff?: number;
  max_campaigns_per_month?: number;
  max_push_notifications_per_month?: number;
  max_storage_mb?: number;
  max_images?: number;
  max_branches?: number;
  max_drivers?: number;
  max_products?: number;
  max_loyalty_members?: number;
  max_active_promotions?: number;
  max_delivery_zones?: number;
  unlimited_flags?: UnlimitedFlags;
  deleted_at?: string | null;
  features?: PricingFeature[];
}

export interface PricingFeature {
  id?: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  icon?: string | null;
  module?: string | null;
  status?: string;
  internal_notes?: string | null;
  deleted_at?: string | null;
  pivot?: { enabled: boolean };
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  billing_status?: string;
  started_at: string;
  ends_at?: string;
  plan?: PricingPlan;
  tenant?: PlatformTenant;
}

export interface EntitlementsUsageItem {
  current: number;
  max: number | null;
  unlimited: boolean;
}

export type EntitlementsUsage = Record<string, EntitlementsUsageItem>;

export interface Entitlements {
  flags: Record<string, boolean>;
  limits?: Record<string, number | null>;
  unlimited?: Record<string, boolean>;
  usage?: EntitlementsUsage;
  plan?: PricingPlan | null;
  subscription?: TenantSubscription | null;
}

export interface TenantEntitlementOverride {
  id: string;
  tenant_id: string;
  override_type: "feature" | "limit";
  override_key: string;
  value_bool?: boolean | null;
  value_int?: number | null;
  is_unlimited?: boolean;
  is_permanent?: boolean;
  expires_at?: string | null;
  reason?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface SubscriptionHistoryEntry {
  id: string;
  tenant_id: string;
  plan_id: string;
  previous_plan_id?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
}

export interface TenantEntitlementsDetail {
  subscription?: TenantSubscription | null;
  plan?: PricingPlan | null;
  history?: SubscriptionHistoryEntry[];
  overrides?: TenantEntitlementOverride[];
  usage?: EntitlementsUsage;
}

export interface UpgradeRequest {
  id: string;
  tenant_id: string;
  current_plan_id?: string | null;
  requested_plan_id?: string | null;
  status: string;
  message?: string | null;
  created_by?: string | null;
  created_at: string;
  tenant?: PlatformTenant;
  currentPlan?: PricingPlan;
  requestedPlan?: PricingPlan;
}

export interface PublicPricingPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  cta_text?: string | null;
  plan_color?: string | null;
  plan_icon?: string | null;
  is_recommended: boolean;
  marketing_features: string[];
  limits: Record<string, number | UnlimitedFlags> & { unlimited_flags?: UnlimitedFlags };
  features: Pick<PricingFeature, "key" | "name" | "category" | "icon">[];
}

export interface PromoMealItem {
  meal_id: string;
  discount_percent: number;
  name?: string;
  description?: string;
  image_url?: string;
  base_price?: number | string;
  promo_price?: number | string;
  campaign_id?: string | null;
  campaign_name?: string;
  campaign_type?: string;
  ends_at?: string | null;
}

export type RevenueRecoveryCampaignType = "closing_soon" | "happy_hour" | "slow_period" | "custom" | "proximity";

export type RevenueRecoveryCampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "deactivated"
  | "archived";

export type RevenueRecoveryDiscountType = "percent" | "fixed";

export interface RevenueRecoveryCampaign {
  id: string;
  name: string;
  campaign_type: RevenueRecoveryCampaignType;
  discount_type: RevenueRecoveryDiscountType;
  discount_value: number | string;
  meal_ids?: string[];
  category_ids?: string[];
  starts_at: string;
  ends_at: string;
  status: RevenueRecoveryCampaignStatus;
  notifications_enabled: boolean;
  notification_title?: string | null;
  notification_message?: string | null;
  target_audience: "all" | "repeat_customers" | "active_customers";
  proximity_bait_tiers?: ProximityBaitTier[] | null;
  redemption_limit?: number | null;
  redemption_count: number;
  orders_count: number;
  recovered_revenue: number | string;
  notifications_sent: number;
  notifications_delivered: number;
  proximity_impressions?: number;
  proximity_push_sent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueRecoveryDashboard {
  campaigns_total: number;
  campaigns_active: number;
  notifications_sent: number;
  notifications_delivered: number;
  notifications_opened: number;
  notification_open_rate: number;
  campaign_orders: number;
  recovered_revenue: number;
  meals_sold: number;
  redemption_rate: number;
  redemptions: number;
  recent_campaigns: RevenueRecoveryCampaign[];
  active_offers: PromoMealItem[];
}

export interface ProximityBaitTier {
  min_km: number;
  max_km: number;
  urgency_label: string;
}

export interface TenantRevenueRecoverySettings {
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  time_based_enabled: boolean;
  proximity_enabled: boolean;
  geofence_radius_km: number;
  tenant_can_edit_radius: boolean;
  kitchen_lat: number | null;
  kitchen_lng: number | null;
  kitchen_address_text: string | null;
  proximity_bait_tiers: ProximityBaitTier[];
  max_daily_proximity_pushes_per_customer: number;
  location_accuracy_max_meters: number;
  updated_at?: string;
}

export interface ProximityBaitPayload {
  campaign_id: string;
  distance_km: number;
  urgency_label: string;
  message: string;
  has_active_time_based_offer: boolean;
  time_based_campaign_name?: string | null;
  time_based_discount_percent?: number | null;
}

export interface StorefrontProximityConfig {
  enabled: boolean;
  requires_email_verification: boolean;
  location_accuracy_max_meters: number;
}

export interface CustomerProximitySession {
  session_token: string;
  expires_at: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
}

export interface PromoMealSelection {
  meal_id: string;
  discount_percent: number;
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
  public_pricing_enabled?: boolean;
}

export interface RestaurantStatus {
  status: RestaurantOperationalStatus;
  is_accepting_orders: boolean;
  promo_alerts_enabled: boolean;
  closing_at?: string | null;
  promo_ends_at?: string | null;
  promo_meals?: PromoMealItem[];
  updated_at?: string;
}

export interface TenantWorkspace {
  tenant_id: string;
  name: string;
  slug: string;
  currency: string;
  country?: string | null;
  country_iso?: string | null;
  timezone?: string | null;
  ui_theme: "light" | "dark";
  ordering_path: string;
  ordering_url_hint?: string;
}

export interface StorefrontWorkspace {
  tenant_id: string;
  slug: string;
  name: string;
  currency: string;
  country?: string | null;
  country_iso?: string | null;
  timezone?: string | null;
  ui_theme: "light" | "dark";
  ordering_path: string;
}

export interface Storefront {
  branding: TenantBranding;
  status: RestaurantStatus;
  workspace?: StorefrontWorkspace;
  pwa?: {
    manifest_path: string;
    start_url: string;
    installable: boolean;
  };
  revenue_recovery?: {
    offers: PromoMealItem[];
    campaigns: Pick<
      RevenueRecoveryCampaign,
      "id" | "name" | "campaign_type" | "ends_at" | "discount_type" | "discount_value"
    >[];
    proximity?: StorefrontProximityConfig;
  };
}

export interface CartItem {
  mealId: string;
  mealName: string;
  basePrice: number;
  originalBasePrice?: number;
  campaignId?: string | null;
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

export interface CrmStrategicAnalytics {
  from: string;
  to: string;
  food_bought: {
    meal_name: string;
    quantity: number;
    order_count: number;
  }[];
  total_amount_spent: number;
  preferred_food: {
    meal_name: string;
    quantity: number;
    order_count: number;
  } | null;
  referral_count: number;
  reward_qualification_by_spend: {
    min_total_spent: number;
    qualified_customer_count: number;
    customers: {
      customer_id: string;
      name?: string | null;
      total_spent: number;
    }[];
  }[];
  orders_in_period: number;
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
