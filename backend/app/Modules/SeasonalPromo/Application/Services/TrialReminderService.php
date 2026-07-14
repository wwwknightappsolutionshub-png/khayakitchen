<?php

namespace App\Modules\SeasonalPromo\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Engagement\Domain\Models\PlatformTenantMessage;
use App\Modules\Engagement\Mail\PlatformToTenantMail;
use App\Modules\SeasonalPromo\Domain\Models\TenantTrialReminder;
use App\Shared\Entitlements\FeatureAccessService;
use Illuminate\Support\Facades\Mail;

class TrialReminderService
{
    public function __construct(private FeatureAccessService $featureAccessService) {}

    /**
     * @return array{sent: int, skipped: int}
     */
    public function sendDueReminders(bool $dryRun = false): array
    {
        $sent = 0;
        $skipped = 0;

        foreach ([7, 3] as $daysBefore) {
            $tenants = Tenant::withoutGlobalScopes()
                ->whereNotNull('created_at')
                ->whereDate('created_at', now()->subDays(FeatureAccessService::FREE_TRIAL_DAYS - $daysBefore)->toDateString())
                ->get();

            foreach ($tenants as $tenant) {
                $trialOnly = $this->featureAccessService->trialOnlyFeatures($tenant->id);
                if ($trialOnly === []) {
                    $skipped++;

                    continue;
                }

                $already = TenantTrialReminder::where('tenant_id', $tenant->id)
                    ->where('days_before_end', $daysBefore)
                    ->exists();
                if ($already) {
                    $skipped++;

                    continue;
                }

                if ($dryRun) {
                    $sent++;

                    continue;
                }

                $this->deliver($tenant, $daysBefore, $trialOnly);
                $sent++;
            }
        }

        return ['sent' => $sent, 'skipped' => $skipped];
    }

    /**
     * @param  list<string>  $featureKeys
     */
    private function deliver(Tenant $tenant, int $daysBefore, array $featureKeys): void
    {
        $labels = collect($featureKeys)->map(fn ($k) => str_replace('_', ' ', $k))->implode(', ');
        $title = $daysBefore === 7
            ? 'Your KhayaOS feature trial ends in 7 days'
            : 'Final reminder: trial ends in 3 days';
        $body = "Your free trial for {$labels} ends in {$daysBefore} day(s). "
            .'Upgrade your plan to keep access after the trial window.';

        $sender = User::withoutGlobalScopes()->where('role', 'super_admin')->first();

        PlatformTenantMessage::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'sender_user_id' => $sender?->id,
            'channel' => 'email',
            'title' => $title,
            'body' => $body,
            'status' => 'sent',
            'sent_at' => now(),
            'created_at' => now(),
        ]);

        $owners = User::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->get();

        foreach ($owners as $user) {
            try {
                Mail::to($user->email)->send(new PlatformToTenantMail(
                    $user->name ?: 'Kitchen owner',
                    $title,
                    $body,
                    $tenant->name,
                ));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        TenantTrialReminder::create([
            'tenant_id' => $tenant->id,
            'days_before_end' => $daysBefore,
            'feature_keys' => $featureKeys,
            'sent_at' => now(),
        ]);
    }
}
