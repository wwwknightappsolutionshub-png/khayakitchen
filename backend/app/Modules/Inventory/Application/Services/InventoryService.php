<?php

namespace App\Modules\Inventory\Application\Services;

use App\Modules\Inventory\Domain\Models\InventoryItem;
use App\Modules\Inventory\Domain\Models\InventoryTransaction;
use App\Modules\Inventory\Domain\Models\RecipeComponent;
use App\Modules\Inventory\Domain\Models\RecipeDefinition;
use App\Modules\Inventory\Events\InventoryUpdated;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use App\Shared\Events\DomainEventLogger;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function listItems(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'inventory.manage');

        return InventoryItem::orderBy('name')->get();
    }

    public function stockIn(array $data, array $permissions): InventoryItem
    {
        $this->permissionService->authorize($permissions, 'inventory.adjust');

        return DB::transaction(function () use ($data) {
            $item = InventoryItem::findOrFail($data['item_id']);

            if (isset($data['cost_per_unit'])) {
                $item->update(['cost_per_unit' => $data['cost_per_unit']]);
            }

            $this->recordTransaction($item, 'in', (float) $data['quantity'], 'stock_in');

            return $item->fresh();
        });
    }

    public function logWaste(array $data, array $permissions): InventoryItem
    {
        $this->permissionService->authorize($permissions, 'inventory.adjust');

        return DB::transaction(function () use ($data) {
            $item = InventoryItem::findOrFail($data['item_id']);
            $this->recordTransaction($item, 'waste', (float) $data['quantity'], 'waste');

            return $item->fresh();
        });
    }

    public function consume(array $data, array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'inventory.manage');

        if (isset($data['order_id'])) {
            return $this->consumeForOrder(Order::with('items')->findOrFail($data['order_id']));
        }

        $item = InventoryItem::findOrFail($data['item_id']);
        $this->recordTransaction($item, 'out', (float) $data['quantity'], $data['reference_type'] ?? 'manual', $data['reference_id'] ?? null);

        return ['items' => [$item->fresh()]];
    }

    public function consumeForOrder(Order $order): array
    {
        $updated = [];

        DB::transaction(function () use ($order, &$updated) {
            foreach ($order->items as $orderItem) {
                $recipe = RecipeDefinition::with('components')->where('meal_id', $orderItem->meal_id)->first();
                if (! $recipe) {
                    continue;
                }

                foreach ($recipe->components as $component) {
                    $qty = (float) $component->quantity * $orderItem->quantity;
                    $item = InventoryItem::findOrFail($component->inventory_item_id);
                    $this->recordTransaction($item, 'out', $qty, 'order', $order->id);
                    $updated[] = $item->fresh();
                }
            }
        });

        return ['items' => $updated];
    }

    public function createRecipe(array $data, array $permissions): RecipeDefinition
    {
        $this->permissionService->authorize($permissions, 'inventory.manage');

        return DB::transaction(function () use ($data) {
            $recipe = RecipeDefinition::create([
                'tenant_id' => $this->tenantContext->id(),
                'meal_id' => $data['meal_id'],
                'portion_size' => $data['portion_size'] ?? 'medium',
                'created_at' => now(),
            ]);

            foreach ($data['components'] as $component) {
                RecipeComponent::create([
                    'tenant_id' => $recipe->tenant_id,
                    'recipe_id' => $recipe->id,
                    'inventory_item_id' => $component['inventory_item_id'],
                    'quantity' => $component['quantity'],
                ]);
            }

            return $recipe->load('components');
        });
    }

    public function listRecipes(?string $mealId, array $permissions)
    {
        $this->permissionService->authorize($permissions, 'inventory.manage');

        $query = RecipeDefinition::with('components.inventoryItem');
        if ($mealId) {
            $query->where('meal_id', $mealId);
        }

        return $query->get();
    }

    private function recordTransaction(
        InventoryItem $item,
        string $type,
        float $quantity,
        ?string $referenceType = null,
        ?string $referenceId = null,
    ): void {
        if (in_array($type, ['out', 'waste'], true) && (float) $item->current_stock < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => ["Insufficient stock for {$item->name}"],
            ]);
        }

        $delta = in_array($type, ['in'], true) ? $quantity : -$quantity;
        if ($type === 'adjustment') {
            $delta = $quantity;
        }

        $item->update([
            'current_stock' => (float) $item->current_stock + $delta,
            'updated_by' => $this->tenantContext->user()?->id,
        ]);

        InventoryTransaction::create([
            'tenant_id' => $item->tenant_id,
            'inventory_item_id' => $item->id,
            'type' => $type,
            'quantity' => $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'created_by' => $this->tenantContext->user()?->id,
            'created_at' => now(),
        ]);

        DomainEventLogger::log($item->tenant_id, 'InventoryUpdated', [
            'item_id' => $item->id,
            'type' => $type,
            'quantity' => $quantity,
        ], $item->id, 'inventory_item');

        InventoryUpdated::dispatch($item->fresh(), $type, $quantity);
    }
}
