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
  likes_count?: number | null;
  likes_enabled?: boolean;
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
  menu_likes_refer_enabled?: boolean;
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
  customer_id?: string;
  is_new_customer?: boolean;
  install_claim_eligible?: boolean;
  install_claim_points?: number;
  app_installed?: boolean;
}

export interface Order {
  id: string;
  customer_id?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_channel?: string | null;
  payment_status?: string | null;
  payment_verified?: boolean;
  payment_proof_uploaded?: boolean;
  payment_awaiting_verification?: boolean;
  payment_accept_blocked?: boolean;
  payment?: CustomerPaymentInfo | null;
  status: string;
  order_type: string;
  scheduled_time?: string;
  total_amount: number;
  discount_total?: number;
  created_at: string;
  items?: OrderItem[];
}

export interface CustomerPaymentInfo {
  id: string;
  provider: string;
  status: string;
  amount: number;
  proof_uploaded: boolean;
  proof_uploaded_at?: string | null;
  verified: boolean;
  verified_at?: string | null;
  wait_seconds: number;
  wait_remaining_seconds: number;
  can_upload_proof: boolean;
  proof_url?: string | null;
}

export interface AccountRow {
  order_id: string;
  order_no: string;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  meals: { name: string; quantity: number; line_total: number }[];
  total_amount: number;
  ordered_at: string;
  payment_channel?: string | null;
  payment_status?: string | null;
  payment_verified: boolean;
  verified_at?: string | null;
  attachment?: {
    url: string;
    mime?: string | null;
    name?: string | null;
    size?: number | null;
    uploaded_at?: string | null;
  } | null;
  orders_path?: string;
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
  app_installed?: boolean;
  app_installed_at?: string | null;
  has_password?: boolean;
  has_passkeys?: boolean;
  profile?: CustomerProfile;
}

export interface CustomerPasskeyCredential {
  id: string;
  device_label?: string | null;
  created_at?: string | null;
}

export interface CustomerAddress {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  is_default?: boolean;
}

export interface CustomMealRequest {
  id: string;
  title?: string | null;
  message: string;
  constraints?: string | null;
  status: "submitted" | "acknowledged" | "closed";
  staff_note?: string | null;
  created_at?: string;
  customer?: { id: string; name: string; phone?: string } | null;
}

export interface DashboardKpis {
  revenue_today: number;
  orders_today: number;
  active_customers: number;
  low_stock_items: number;
}

export interface LoyaltyAccount {
  id?: string;
  customer_id: string;
  points_balance: number;
  stamps_balance?: number;
  tier?: string;
  membership_status?: "prospect" | "eligible" | "active";
  enrolled_at?: string | null;
  enrollment_source?: string | null;
  install_claimed_at?: string | null;
  install_welcome_sent_at?: string | null;
}

export interface LoyaltyPackage {
  id: string;
  name: string;
  description?: string | null;
  package_type: "stamp" | "points";
  goal_value: number;
  reward_type: string;
  reward_value?: number | null;
  reward_label: string;
  is_active: boolean;
  sort_order?: number;
}

export interface LoyaltySettings {
  enrollments_paused: boolean;
  referral_stamp_credit: number;
  referral_points_credit: number;
  near_goal_threshold_percent: number;
  install_claim_points?: number;
  install_welcome_subject?: string | null;
  install_welcome_body?: string | null;
}

export interface LoyaltyPackageProgress {
  id: string;
  loyalty_package_id: string;
  current_progress: number;
  times_completed: number;
  package?: LoyaltyPackage;
}

export interface LoyaltyRedemptionVoucher {
  id: string;
  code: string;
  kind: "points" | "package" | string;
  status: "pending" | "fulfilled" | "cancelled" | "expired" | string;
  points: number;
  stamps: number;
  reward_type: string;
  reward_value?: number | null;
  reward_label: string;
  package_id?: string | null;
  expires_at?: string | null;
  fulfilled_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  customer?: { id: string; name?: string | null; phone?: string | null } | null;
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
  tenants_online?: number;
  tenants_away?: number;
  tenants_with_staff_pwa?: number;
  customers_with_pwa?: number;
  tenants_with_customer_pwa?: number;
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
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  currency?: string | null;
  country?: string | null;
  country_iso?: string | null;
  timezone?: string | null;
  presence?: "online" | "away" | "offline";
  last_seen_at?: string | null;
  last_login_at?: string | null;
  staff_pwa_installed?: boolean;
  staff_pwa_installs?: number;
  customer_pwa_installs?: number;
  last_poked_at?: string | null;
  signup_metadata?: Record<string, unknown> | null;
  owner?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role_title?: string | null;
    email_verified_at?: string | null;
  } | null;
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
  /** ISO date (YYYY-MM-DD) when the feature/module shipped for catalog records */
  implemented_at?: string | null;
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
  target_audience: "all" | "repeat_customers" | "active_customers" | "loyalty_members";
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
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
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
  og_image_url?: string | null;
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
  logo_url?: string | null;
  currency: string;
  country?: string | null;
  country_iso?: string | null;
  timezone?: string | null;
  ui_theme: "light" | "dark";
  ordering_path: string;
  ordering_url_hint?: string;
}

export interface TenantWhatsAppSettings {
  tenant_id: string;
  enabled: boolean;
  provider: "meta" | "twilio" | "genius";
  phone_number_id?: string | null;
  has_access_token: boolean;
  twilio_account_sid?: string | null;
  has_twilio_auth_token: boolean;
  twilio_from?: string | null;
  hosted_session?: {
    session_id?: string | null;
    phone_number?: string | null;
    status: "inactive" | "pending_scan" | "active" | "expired" | "disconnected";
    qr_payload?: string | null;
    connected_at?: string | null;
    last_seen_at?: string | null;
    expires_at?: string | null;
    remaining_days?: number | null;
    lifecycle_days: number;
  };
  using_platform_fallback: boolean;
  active_source: "tenant" | "platform";
  active_provider: string;
  platform_configured: boolean;
}

export interface PlatformWhatsAppSettings {
  enabled: boolean;
  provider: "genius" | "meta" | "twilio";
  has_api_key: boolean;
  session_id?: string | null;
  base_url?: string | null;
  meta_phone_number_id?: string | null;
  has_meta_access_token: boolean;
  twilio_account_sid?: string | null;
  has_twilio_auth_token: boolean;
  twilio_from?: string | null;
  configured: boolean;
  active_provider: string;
  active_source: "platform";
  owner_welcome_image?: {
    path?: string | null;
    url?: string | null;
    mime?: string | null;
    has_data: boolean;
  };
}

export interface PlatformWhatsAppQueueStatus {
  pending: number;
  reserved: number;
  failed: number;
  markers: string[];
  include_mixed: boolean;
}

export interface PlatformWhatsAppQueueFlushResult {
  deleted_jobs: number;
  deleted_failed_jobs: number;
  before: PlatformWhatsAppQueueStatus;
  include_failed: boolean;
  include_mixed: boolean;
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

export interface SeasonalPromoSplash {
  id: string;
  image_url?: string | null;
  headline: string;
  subheadline?: string | null;
  details?: string | null;
  cta_label?: string | null;
  meal_id: string;
  menu_hash: string;
}

export interface Storefront {
  branding: TenantBranding;
  status: RestaurantStatus;
  workspace?: StorefrontWorkspace;
  review_ticker?: { customer_name: string; summary: string }[];
  seasonal_promo?: SeasonalPromoSplash | null;
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

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_type: "platform_user" | "tenant_user" | "customer";
  sender_user_id?: string | null;
  sender_customer_id?: string | null;
  sender_label?: string | null;
  body: string;
  created_at: string;
}

export interface ChatThread {
  id: string;
  type: "platform_tenant" | "tenant_customer";
  tenant_id: string;
  subject?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  order_id?: string | null;
  order_status?: string | null;
  in_session?: boolean;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  messages?: ChatMessage[];
  updated_at?: string;
}

export interface PlatformTenantMessage {
  id: string;
  tenant_id: string;
  channel: "push" | "email" | "suggestion";
  title: string;
  body: string;
  status: string;
  metadata?: {
    kind?: "peak" | "off_peak" | string;
    cta_path?: string;
    window?: {
      weekday?: number;
      start_hour?: number;
      end_hour?: number;
      label?: string;
    };
    local_at?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
}

export interface KitchenReview {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  body: string;
  summary?: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface MealReferPayload {
  meal_id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  restaurant_name: string;
  message: string;
  whatsapp_text: string;
  menu_url?: string;
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
  target_audience: "all" | "repeat_customers" | "active_customers" | "loyalty_members";
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

/** Tenant-to-tenant Refer & Reward (not customer Loyalty referrals). */
export interface TenantReferralInvite {
  id: string;
  prospect_email?: string | null;
  prospect_phone?: string | null;
  prospect_name?: string | null;
  channel: string;
  status: string;
  invited_at?: string | null;
}

export interface TenantReferralSummary {
  code: string;
  link: string;
  reward_days: number;
  referee_trial_days: number;
  stats: {
    invites_sent: number;
    successful_referrals: number;
    days_earned: number;
  };
  invites: TenantReferralInvite[];
  whatsapp_share_text: string;
}

export interface PlatformLead {
  id: string;
  prospect_email?: string | null;
  prospect_phone?: string | null;
  prospect_name?: string | null;
  channel: string;
  status: string;
  invited_at?: string | null;
  signed_up_at?: string | null;
  rewarded_at?: string | null;
  referrer_tenant?: { id: string; name: string; slug: string } | null;
  referred_tenant?: { id: string; name: string; slug: string } | null;
  referral_code?: { id: string; code: string } | null;
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
