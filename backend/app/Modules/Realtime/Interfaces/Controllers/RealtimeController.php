<?php

namespace App\Modules\Realtime\Interfaces\Controllers;

use App\Modules\Realtime\Application\Services\RealtimePollingService;
use App\Modules\Realtime\Infrastructure\WebSocketGateway;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class RealtimeController extends Controller
{
    public function __construct(
        private RealtimePollingService $pollingService,
        private WebSocketGateway $gateway,
        private TenantContext $tenantContext,
    ) {}

    public function config()
    {
        return ApiResponse::success($this->connectionMeta(true));
    }

    public function publicConfig()
    {
        return ApiResponse::success($this->connectionMeta(false));
    }

    private function connectionMeta(bool $includePrivateChannels): array
    {
        $tenantId = $this->tenantContext->id();

        $channels = [
            'customer' => $this->gateway->channelName($tenantId, 'customer'),
        ];

        if ($includePrivateChannels) {
            $channels['admin'] = $this->gateway->channelName($tenantId, 'admin');
            $channels['kitchen'] = $this->gateway->channelName($tenantId, 'kitchen');
        }

        return [
            'driver' => config('broadcasting.default'),
            'key' => config('broadcasting.connections.reverb.key'),
            'host' => config('realtime.websocket.public_host', env('REVERB_HOST', 'localhost')),
            'port' => (int) config('realtime.websocket.public_port', env('REVERB_PORT', 8080)),
            'scheme' => config('realtime.websocket.scheme', 'ws'),
            'channels' => $channels,
            'auth_endpoint' => url('/api/broadcasting/auth'),
        ];
    }

    public function orders(Request $request)
    {
        $since = $request->query('since');
        $channel = $request->query('channel');
        $sinceIso = $request->query('since_iso');

        if ($since || $channel) {
            return ApiResponse::success(
                $this->pollingService->orderUpdates($since, $channel),
            );
        }

        return ApiResponse::success(
            $this->pollingService->compactOrders($sinceIso),
        );
    }

    public function dashboardSummary()
    {
        return ApiResponse::success($this->pollingService->dashboardSummary());
    }

    public function orderStatus(string $id)
    {
        $status = $this->pollingService->orderStatus($id);

        if (! $status) {
            return ApiResponse::error('Order not found', 'NOT_FOUND', null, 404);
        }

        return ApiResponse::success($status);
    }
}
