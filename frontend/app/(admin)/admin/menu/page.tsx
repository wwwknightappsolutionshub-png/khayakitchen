"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UtensilsCrossed, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { menuAdminService } from "@/services/menu-admin.service";
import type { AdminMeal, AdminOptionGroup } from "@/lib/types";
import { formatCurrency, toNumber } from "@/lib/utils";

type MealForm = {
  name: string;
  description: string;
  image_url: string;
  base_price: string;
  is_active: boolean;
};

const emptyMealForm: MealForm = {
  name: "",
  description: "",
  image_url: "",
  base_price: "",
  is_active: true,
};

export default function MenuAdminPage() {
  const queryClient = useQueryClient();
  const [editingMeal, setEditingMeal] = useState<AdminMeal | null>(null);
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealForm, setMealForm] = useState<MealForm>(emptyMealForm);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", type: "single" as "single" | "multiple" });
  const [optionForms, setOptionForms] = useState<Record<string, { name: string; price_delta: string }>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["menu", "admin"],
    queryFn: () => menuAdminService.getAdminMenu(),
  });

  const meals = data?.meals ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["menu", "admin"] });

  const saveMealMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: mealForm.name,
        description: mealForm.description || undefined,
        image_url: mealForm.image_url || undefined,
        base_price: mealForm.base_price ? toNumber(mealForm.base_price) : 0,
        is_active: mealForm.is_active,
      };
      if (editingMeal) {
        return menuAdminService.updateMeal(editingMeal.id, payload);
      }
      return menuAdminService.createMeal(payload);
    },
    onSuccess: () => {
      invalidate();
      setShowMealForm(false);
      setEditingMeal(null);
      setMealForm(emptyMealForm);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (meal: AdminMeal) =>
      menuAdminService.updateMeal(meal.id, { is_active: !meal.is_active }),
    onSuccess: invalidate,
  });

  const deleteMealMutation = useMutation({
    mutationFn: (id: string) => menuAdminService.deleteMeal(id),
    onSuccess: invalidate,
  });

  const createGroupMutation = useMutation({
    mutationFn: ({ mealId, name, type }: { mealId: string; name: string; type: "single" | "multiple" }) =>
      menuAdminService.createOptionGroup({ meal_id: mealId, name, type }),
    onSuccess: () => {
      invalidate();
      setGroupForm({ name: "", type: "single" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => menuAdminService.deleteOptionGroup(id),
    onSuccess: invalidate,
  });

  const createOptionMutation = useMutation({
    mutationFn: ({
      groupId,
      name,
      price_delta,
    }: {
      groupId: string;
      name: string;
      price_delta: number;
    }) => menuAdminService.createOption({ option_group_id: groupId, name, price_delta }),
    onSuccess: (_, vars) => {
      invalidate();
      setOptionForms((prev) => ({ ...prev, [vars.groupId]: { name: "", price_delta: "" } }));
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (id: string) => menuAdminService.deleteOption(id),
    onSuccess: invalidate,
  });

  const openCreateMeal = () => {
    setEditingMeal(null);
    setMealForm(emptyMealForm);
    setShowMealForm(true);
  };

  const openEditMeal = (meal: AdminMeal) => {
    setEditingMeal(meal);
    setMealForm({
      name: meal.name,
      description: meal.description ?? "",
      image_url: meal.image_url ?? "",
      base_price: String(meal.base_price ?? ""),
      is_active: meal.is_active,
    });
    setShowMealForm(true);
  };

  const handleImageUpload = async (mealId: string, file: File) => {
    setImageUploading(true);
    setImageUploadProgress("Uploading…");
    try {
      const { meal } = await menuAdminService.uploadMealImage(mealId, file);
      setMealForm((f) => ({ ...f, image_url: meal.image_url ?? f.image_url }));
      setImageUploadProgress("Upload complete");
      invalidate();
    } catch {
      setImageUploadProgress("Upload failed — try again");
    } finally {
      setImageUploading(false);
      setTimeout(() => setImageUploadProgress(null), 3000);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Menu Management</h1>
            <p className="text-sm text-muted">Meals, option groups, and customizations</p>
          </div>
        </div>
        <Button onClick={openCreateMeal}>
          <Plus className="h-4 w-4" />
          Add meal
        </Button>
      </header>

      {showMealForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingMeal ? "Edit meal" : "New meal"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                value={mealForm.name}
                onChange={(e) => setMealForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Base price (£)"
                type="number"
                min="0"
                step="0.01"
                value={mealForm.base_price}
                onChange={(e) => setMealForm((f) => ({ ...f, base_price: e.target.value }))}
              />
            </div>
            <Input
              label="Description"
              value={mealForm.description}
              onChange={(e) => setMealForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              label="Image URL"
              value={mealForm.image_url}
              onChange={(e) => setMealForm((f) => ({ ...f, image_url: e.target.value }))}
            />
            {editingMeal && (
              <div>
                <label className="mb-2 block text-sm font-medium">Upload image</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={imageUploading}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && editingMeal) void handleImageUpload(editingMeal.id, file);
                    e.target.value = "";
                  }}
                />
                {imageUploadProgress && (
                  <p className="mt-1 text-xs text-muted">{imageUploadProgress}</p>
                )}
              </div>
            )}
            {mealForm.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mealForm.image_url}
                alt="Meal preview"
                className="h-24 w-24 rounded-lg object-cover border border-border"
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mealForm.is_active}
                onChange={(e) => setMealForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="accent-primary"
              />
              Active on menu
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMealMutation.mutate()}
                isLoading={saveMealMutation.isPending}
                disabled={!mealForm.name.trim()}
              >
                {editingMeal ? "Save changes" : "Create meal"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowMealForm(false);
                  setEditingMeal(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Meal</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Price</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Status</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Groups</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
              {!isLoading && meals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No meals yet — add your first item
                  </td>
                </tr>
              )}
              {meals.map((meal) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  expanded={expandedMealId === meal.id}
                  onToggleExpand={() =>
                    setExpandedMealId((id) => (id === meal.id ? null : meal.id))
                  }
                  onEdit={() => openEditMeal(meal)}
                  onToggleActive={() => toggleActiveMutation.mutate(meal)}
                  onDelete={() => {
                    if (confirm(`Delete "${meal.name}"?`)) deleteMealMutation.mutate(meal.id);
                  }}
                  groupForm={groupForm}
                  onGroupFormChange={setGroupForm}
                  onCreateGroup={(name, type) =>
                    createGroupMutation.mutate({ mealId: meal.id, name, type })
                  }
                  onDeleteGroup={(id) => deleteGroupMutation.mutate(id)}
                  optionForms={optionForms}
                  onOptionFormChange={(groupId, field, value) =>
                    setOptionForms((prev) => ({
                      ...prev,
                      [groupId]: { ...prev[groupId], name: prev[groupId]?.name ?? "", price_delta: prev[groupId]?.price_delta ?? "", [field]: value },
                    }))
                  }
                  onCreateOption={(groupId, name, price_delta) =>
                    createOptionMutation.mutate({ groupId, name, price_delta })
                  }
                  onDeleteOption={(id) => deleteOptionMutation.mutate(id)}
                  isCreatingGroup={createGroupMutation.isPending}
                  isCreatingOption={createOptionMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MealRow({
  meal,
  expanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
  onDelete,
  groupForm,
  onGroupFormChange,
  onCreateGroup,
  onDeleteGroup,
  optionForms,
  onOptionFormChange,
  onCreateOption,
  onDeleteOption,
  isCreatingGroup,
  isCreatingOption,
}: {
  meal: AdminMeal;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  groupForm: { name: string; type: "single" | "multiple" };
  onGroupFormChange: (form: { name: string; type: "single" | "multiple" }) => void;
  onCreateGroup: (name: string, type: "single" | "multiple") => void;
  onDeleteGroup: (id: string) => void;
  optionForms: Record<string, { name: string; price_delta: string }>;
  onOptionFormChange: (groupId: string, field: "name" | "price_delta", value: string) => void;
  onCreateOption: (groupId: string, name: string, price_delta: number) => void;
  onDeleteOption: (id: string) => void;
  isCreatingGroup: boolean;
  isCreatingOption: boolean;
}) {
  const groups = meal.option_groups ?? [];

  return (
    <>
      <tr className="border-b border-border transition-colors hover:bg-surface-elevated/50">
        <td className="px-4 py-3">
          <button type="button" onClick={onToggleExpand} className="text-left font-medium hover:text-primary">
            {meal.name}
          </button>
          {meal.description && (
            <p className="mt-0.5 text-xs text-muted line-clamp-1">{meal.description}</p>
          )}
        </td>
        <td className="px-4 py-3 font-mono">{formatCurrency(meal.base_price)}</td>
        <td className="px-4 py-3">
          <Badge variant={meal.is_active ? "secondary" : "outline"}>
            {meal.is_active ? "Active" : "Inactive"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-muted">{groups.length}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit meal">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="secondary" onClick={onToggleActive}>
              {meal.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete} aria-label="Delete meal">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-surface-elevated/30">
          <td colSpan={5} className="px-4 py-4">
            <div className="space-y-4">
              <p className="text-sm font-medium">Option groups</p>
              {groups.length === 0 && (
                <p className="text-sm text-muted">No option groups yet</p>
              )}
              {groups.map((group) => (
                <OptionGroupBlock
                  key={group.id}
                  group={group}
                  optionForm={optionForms[group.id] ?? { name: "", price_delta: "" }}
                  onOptionFormChange={(field, value) => onOptionFormChange(group.id, field, value)}
                  onCreateOption={() => {
                    const form = optionForms[group.id] ?? { name: "", price_delta: "" };
                    if (!form.name.trim()) return;
                    onCreateOption(group.id, form.name, toNumber(form.price_delta));
                  }}
                  onDeleteGroup={() => onDeleteGroup(group.id)}
                  onDeleteOption={onDeleteOption}
                  isCreatingOption={isCreatingOption}
                />
              ))}
              <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius)] border border-dashed border-border p-3">
                <Input
                  label="New group name"
                  value={groupForm.name}
                  onChange={(e) => onGroupFormChange({ ...groupForm, name: e.target.value })}
                  className="min-w-[160px] flex-1"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Type</label>
                  <select
                    className="h-10 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                    value={groupForm.type}
                    onChange={(e) =>
                      onGroupFormChange({
                        ...groupForm,
                        type: e.target.value as "single" | "multiple",
                      })
                    }
                  >
                    <option value="single">Single choice</option>
                    <option value="multiple">Multiple choice</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  onClick={() => onCreateGroup(groupForm.name, groupForm.type)}
                  isLoading={isCreatingGroup}
                  disabled={!groupForm.name.trim()}
                >
                  Add group
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function OptionGroupBlock({
  group,
  optionForm,
  onOptionFormChange,
  onCreateOption,
  onDeleteGroup,
  onDeleteOption,
  isCreatingOption,
}: {
  group: AdminOptionGroup;
  optionForm: { name: string; price_delta: string };
  onOptionFormChange: (field: "name" | "price_delta", value: string) => void;
  onCreateOption: () => void;
  onDeleteGroup: () => void;
  onDeleteOption: (id: string) => void;
  isCreatingOption: boolean;
}) {
  const options = group.options ?? [];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{group.name}</span>
          <Badge variant="outline" className="capitalize">
            {group.type}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={onDeleteGroup} aria-label="Delete group">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="mb-2 space-y-1">
        {options.map((opt) => (
          <li key={opt.id} className="flex items-center justify-between text-sm">
            <span>
              {opt.name}
              {toNumber(opt.price_delta) !== 0 && (
                <span className="ml-2 font-mono text-muted">
                  +{formatCurrency(opt.price_delta)}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onDeleteOption(opt.id)}
              className="text-muted hover:text-danger"
              aria-label={`Delete ${opt.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Option name"
          value={optionForm.name}
          onChange={(e) => onOptionFormChange("name", e.target.value)}
          className="min-w-[120px] flex-1"
        />
        <Input
          placeholder="Price +£"
          type="number"
          step="0.01"
          value={optionForm.price_delta}
          onChange={(e) => onOptionFormChange("price_delta", e.target.value)}
          className="w-24"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={onCreateOption}
          isLoading={isCreatingOption}
          disabled={!optionForm.name.trim()}
        >
          Add option
        </Button>
      </div>
    </div>
  );
}
