<?php

namespace App\Modules\Orders\Infrastructure\Repositories;

use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Database\BaseRepository;
use App\Shared\Tenancy\TenantContext;

class OrderRepository extends BaseRepository
{
    public function __construct(Order $model, TenantContext $tenantContext)
    {
        parent::__construct($model, $tenantContext);
    }

    public function list(?string $status = null)
    {
        $query = $this->query()
            ->with(['items.options', 'customer', 'latestPayment'])
            ->orderByDesc('created_at');

        if ($status) {
            $query->where('status', $status);
        }

        return $query->get()->map(function (Order $order) {
            $order->setAttribute('customer_name', $order->customer?->name);
            $order->setAttribute('customer_phone', $order->customer?->phone);
            $order->setAttribute('payment_channel', $order->latestPayment?->provider);

            return $order;
        });
    }
}
