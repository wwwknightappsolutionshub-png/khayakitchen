<?php

namespace App\Modules\Realtime\Application\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class RealtimeEventBuffer
{
    public function push(string $tenantId, string $channel, string $event, array $payload): string
    {
        $id = (string) Str::uuid();
        $entry = [
            'id' => $id,
            'channel' => $channel,
            'event' => $event,
            'payload' => $payload,
            'ts' => now()->toIso8601String(),
        ];

        $key = $this->bufferKey($tenantId);
        $events = Cache::get($key, []);
        $events[] = $entry;

        $max = (int) config('realtime.buffer.max_events', 200);
        if (count($events) > $max) {
            $events = array_slice($events, -$max);
        }

        $ttl = (int) config('realtime.buffer.ttl_seconds', 3600);
        Cache::put($key, $events, now()->addSeconds($ttl));

        return $id;
    }

    public function since(string $tenantId, ?string $cursor, ?string $channel = null): array
    {
        $events = Cache::get($this->bufferKey($tenantId), []);
        $foundCursor = $cursor === null;

        $filtered = [];
        foreach ($events as $event) {
            if (! $foundCursor) {
                if ($event['id'] === $cursor) {
                    $foundCursor = true;
                }
                continue;
            }

            if ($channel !== null && $event['channel'] !== $channel) {
                continue;
            }

            $filtered[] = $event;
        }

        $lastId = $events !== [] ? end($events)['id'] : $cursor;

        return [
            'cursor' => $lastId,
            'events' => $filtered,
        ];
    }

    private function bufferKey(string $tenantId): string
    {
        return "realtime:buffer:{$tenantId}";
    }
}
