"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { BackendPage } from "@/components/shared/BackendPage";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { ScrollTabs } from "@/components/ui/ScrollTabs";
import { inventoryService } from "@/services/inventory.service";
import { cn, formatDate, toNumber } from "@/lib/utils";

type Tab = "stock" | "levels" | "waste" | "adjust" | "history";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("levels");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockCost, setStockCost] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    unit: "unit" as "kg" | "g" | "liter" | "unit",
    current_stock: "",
    reorder_level: "",
    cost_per_unit: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryService.getInventory(),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["inventory", "transactions"],
    queryFn: () => inventoryService.getTransactions(),
    enabled: tab === "history",
  });

  const items = data?.items ?? [];
  const transactions = txData?.transactions ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory", "transactions"] });
  };

  const stockInMutation = useMutation({
    mutationFn: () =>
      inventoryService.stockIn({
        item_id: selectedItemId,
        quantity: toNumber(stockQty),
        cost_per_unit: stockCost ? toNumber(stockCost) : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setStockQty("");
      setStockCost("");
    },
  });

  const wasteMutation = useMutation({
    mutationFn: () =>
      inventoryService.logWaste({ item_id: selectedItemId, quantity: toNumber(wasteQty) }),
    onSuccess: () => {
      invalidate();
      setWasteQty("");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      inventoryService.adjustStock({ item_id: selectedItemId, quantity: toNumber(adjustQty) }),
    onSuccess: () => {
      invalidate();
      setAdjustQty("");
    },
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      inventoryService.createItem({
        name: newItem.name,
        unit: newItem.unit,
        current_stock: newItem.current_stock ? toNumber(newItem.current_stock) : undefined,
        reorder_level: newItem.reorder_level ? toNumber(newItem.reorder_level) : undefined,
        cost_per_unit: newItem.cost_per_unit ? toNumber(newItem.cost_per_unit) : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setShowAddItem(false);
      setNewItem({
        name: "",
        unit: "unit",
        current_stock: "",
        reorder_level: "",
        cost_per_unit: "",
      });
    },
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "levels", label: "Stock levels" },
    { id: "stock", label: "Stock in" },
    { id: "waste", label: "Waste" },
    { id: "adjust", label: "Adjustment" },
    { id: "history", label: "History" },
  ];

  const itemSelect = (
    <div>
      <label className="mb-1.5 block text-sm font-medium">Item</label>
      <select
        className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
        value={selectedItemId}
        onChange={(e) => setSelectedItemId(e.target.value)}
      >
        <option value="">Select item…</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({toNumber(item.current_stock)} {item.unit})
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <p className="text-sm text-muted">Stock levels, movements, and adjustments</p>
          </div>
        </div>
        <div className="backend-header-actions">
          <Button onClick={() => setShowAddItem(true)}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>
      </header>

      <ScrollTabs className="mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary/15 text-primary"
                : "text-muted hover:bg-surface-elevated hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </ScrollTabs>

      {showAddItem && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New inventory item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Name"
              value={newItem.name}
              onChange={(e) => setNewItem((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Unit</label>
                <select
                  className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                  value={newItem.unit}
                  onChange={(e) =>
                    setNewItem((f) => ({
                      ...f,
                      unit: e.target.value as typeof newItem.unit,
                    }))
                  }
                >
                  <option value="unit">Unit</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="liter">Liter</option>
                </select>
              </div>
              <Input
                label="Initial stock"
                type="number"
                min="0"
                value={newItem.current_stock}
                onChange={(e) => setNewItem((f) => ({ ...f, current_stock: e.target.value }))}
              />
              <Input
                label="Reorder level"
                type="number"
                min="0"
                value={newItem.reorder_level}
                onChange={(e) => setNewItem((f) => ({ ...f, reorder_level: e.target.value }))}
              />
              <Input
                label="Cost per unit (£)"
                type="number"
                min="0"
                step="0.01"
                value={newItem.cost_per_unit}
                onChange={(e) => setNewItem((f) => ({ ...f, cost_per_unit: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createItemMutation.mutate()}
                isLoading={createItemMutation.isPending}
                disabled={!newItem.name.trim()}
              >
                Create item
              </Button>
              <Button variant="secondary" onClick={() => setShowAddItem(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "stock" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stock in</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-4">
            {itemSelect}
            <Input
              label="Quantity"
              type="number"
              min="0.0001"
              step="any"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
            <Input
              label="Cost per unit (£, optional)"
              type="number"
              min="0"
              step="0.01"
              value={stockCost}
              onChange={(e) => setStockCost(e.target.value)}
            />
            <Button
              onClick={() => stockInMutation.mutate()}
              isLoading={stockInMutation.isPending}
              disabled={!selectedItemId || !stockQty}
            >
              Record stock in
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "waste" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Log waste</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-4">
            {itemSelect}
            <Input
              label="Quantity wasted"
              type="number"
              min="0.0001"
              step="any"
              value={wasteQty}
              onChange={(e) => setWasteQty(e.target.value)}
            />
            <Button
              onClick={() => wasteMutation.mutate()}
              isLoading={wasteMutation.isPending}
              disabled={!selectedItemId || !wasteQty}
            >
              Log waste
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "adjust" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stock adjustment</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-4">
            {itemSelect}
            <Input
              label="New quantity (set absolute level)"
              type="number"
              step="any"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
            <Button
              onClick={() => adjustMutation.mutate()}
              isLoading={adjustMutation.isPending}
              disabled={!selectedItemId || adjustQty === ""}
            >
              Apply adjustment
            </Button>
          </CardContent>
        </Card>
      )}

      {(tab === "levels" || tab === "history") && (
        <Card>
          {tab === "history" ? (
            <TableScroll bordered={false}>
              <table className={BACKEND_TABLE_CLASS}>
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Date</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Type</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Item</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading &&
                    Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)}
                  {!txLoading && transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted">
                        No transactions yet
                      </td>
                    </tr>
                  )}
                  {transactions.map((tx) => {
                    const item = items.find((i) => i.id === tx.inventory_item_id);
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-border transition-colors hover:bg-surface-elevated/50"
                      >
                        <td className="px-4 py-3 text-muted">{formatDate(tx.created_at)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {tx.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{item?.name ?? tx.inventory_item_id.slice(0, 8)}</td>
                        <td className="px-4 py-3 font-mono">{toNumber(tx.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <TableScroll bordered={false}>
              <table className={BACKEND_TABLE_CLASS}>
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
                        <td className="px-4 py-3 font-mono">{toNumber(item.cost_per_unit).toFixed(2)}</td>
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
            </TableScroll>
          )}
        </Card>
      )}
    </BackendPage>
  );
}
