"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { inventoryService } from "@/services/inventory.service";
import { cn, formatCurrency, toNumber } from "@/lib/utils";

export default function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryService.getInventory(),
  });

  const items = data?.items ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted">Stock levels and reorder alerts</p>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Item</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Unit</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Current Stock</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Reorder Level</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Cost/Unit</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No inventory items
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const stock = toNumber(item.current_stock);
                const reorder = toNumber(item.reorder_level);
                const isLow = stock <= reorder;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-border transition-colors hover:bg-surface-elevated/50"
                  >
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-muted">{item.unit}</td>
                    <td className="px-4 py-3 font-mono">{stock}</td>
                    <td className="px-4 py-3 font-mono text-muted">{reorder}</td>
                    <td className="px-4 py-3 font-mono">{formatCurrency(item.cost_per_unit)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={isLow ? "warning" : "secondary"}
                        className={cn(isLow && "bg-warning/20 text-warning")}
                      >
                        {isLow ? "Low Stock" : "OK"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
