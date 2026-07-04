<?php

namespace App\Modules\Pricing\Domain\Models;

use App\Shared\Database\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Plan extends Model
{
    use HasUuid, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_monthly',
        'price_yearly',
        'currency',
        'cta_text',
        'plan_color',
        'plan_icon',
        'is_active',
        'is_visible',
        'is_recommended',
        'display_order',
        'marketing_features',
        'max_menu_items',
        'max_orders_per_day',
        'max_customers',
        'max_categories',
        'max_staff',
        'max_campaigns_per_month',
        'max_push_notifications_per_month',
        'max_storage_mb',
        'max_images',
        'max_branches',
        'max_drivers',
        'max_products',
        'max_loyalty_members',
        'max_active_promotions',
        'max_delivery_zones',
        'unlimited_flags',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'is_active' => 'boolean',
            'is_visible' => 'boolean',
            'is_recommended' => 'boolean',
            'marketing_features' => 'array',
            'unlimited_flags' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Plan $plan) {
            if (! $plan->slug) {
                $plan->slug = Str::slug($plan->name);
            }
        });
    }

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->withPivot('enabled')
            ->withTimestamps();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(TenantSubscription::class);
    }
}
