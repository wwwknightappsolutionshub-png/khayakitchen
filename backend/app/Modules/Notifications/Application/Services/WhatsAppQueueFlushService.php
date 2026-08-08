<?php

namespace App\Modules\Notifications\Application\Services;

use Illuminate\Support\Facades\DB;

/**
 * Inspect and purge WhatsApp-related rows in the database queue so reconnecting
 * Genius after a quota outage does not replay a backlog.
 */
class WhatsAppQueueFlushService
{
    /**
     * Unique job class basenames present in Laravel queue payloads.
     *
     * @var list<string>
     */
    public const PURE_WHATSAPP_MARKERS = [
        'SendWhatsAppMessageJob',
        'SendSignupWelcomeWhatsAppJob',
    ];

    /**
     * Jobs that may also send email/push — opt-in only.
     *
     * @var list<string>
     */
    public const MIXED_CHANNEL_MARKERS = [
        'DeliverPromoAlertJob',
        'DeliverCampaignJob',
        'DeliverRevenueRecoveryNotificationJob',
    ];

    /**
     * @return array{
     *     pending: int,
     *     reserved: int,
     *     failed: int,
     *     markers: list<string>,
     *     include_mixed: bool
     * }
     */
    public function status(bool $includeMixed = false): array
    {
        $markers = $this->markers($includeMixed);
        $jobsQuery = $this->matchingQuery('jobs', $markers);

        return [
            'pending' => (clone $jobsQuery)->whereNull('reserved_at')->count(),
            'reserved' => (clone $jobsQuery)->whereNotNull('reserved_at')->count(),
            'failed' => $this->matchingQuery('failed_jobs', $markers)->count(),
            'markers' => $markers,
            'include_mixed' => $includeMixed,
        ];
    }

    /**
     * @return array{
     *     deleted_jobs: int,
     *     deleted_failed_jobs: int,
     *     before: array{pending: int, reserved: int, failed: int, markers: list<string>, include_mixed: bool},
     *     include_failed: bool,
     *     include_mixed: bool
     * }
     */
    public function flush(bool $includeFailed = true, bool $includeMixed = false): array
    {
        $markers = $this->markers($includeMixed);
        $before = $this->status($includeMixed);

        $deletedJobs = $this->matchingQuery('jobs', $markers)->delete();
        $deletedFailed = $includeFailed
            ? $this->matchingQuery('failed_jobs', $markers)->delete()
            : 0;

        return [
            'deleted_jobs' => $deletedJobs,
            'deleted_failed_jobs' => $deletedFailed,
            'before' => $before,
            'include_failed' => $includeFailed,
            'include_mixed' => $includeMixed,
        ];
    }

    /**
     * @return list<string>
     */
    public function markers(bool $includeMixed = false): array
    {
        if ($includeMixed) {
            return array_values(array_merge(self::PURE_WHATSAPP_MARKERS, self::MIXED_CHANNEL_MARKERS));
        }

        return self::PURE_WHATSAPP_MARKERS;
    }

    /**
     * @param  list<string>  $markers
     * @return \Illuminate\Database\Query\Builder
     */
    private function matchingQuery(string $table, array $markers)
    {
        $query = DB::table($table);

        $query->where(function ($outer) use ($markers) {
            foreach ($markers as $marker) {
                $outer->orWhere('payload', 'like', '%'.$marker.'%');
            }
        });

        return $query;
    }
}
