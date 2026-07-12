"use client";

import { useState, type ComponentProps } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UtensilsCrossed, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BackendPage } from "@/components/shared/BackendPage";
import { UpgradeLimitModal } from "@/components/shared/UpgradeLimitModal";
import { MealExtrasEditor } from "@/components/admin/MealExtrasEditor";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { MobileDataCard, ResponsiveDataView } from "@/components/ui/MobileDataCard";
import { menuAdminService } from "@/services/menu-admin.service";
import type { AdminMeal } from "@/lib/types";
import { parseLimitError, type LimitErrorInfo } from "@/lib/limit-error";
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

const defaultGroupForm: { name: string; type: "single" | "multiple" } = { name: "Extras", type: "multiple" };

export default function MenuAdminPage() {
  const queryClient = useQueryClient();
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [showMealForm, setShowMealForm] = useState(false);
  const [mealForm, setMealForm] = useState<MealForm>(emptyMealForm);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [optionForms, setOptionForms] = useState<Record<string, { name: string; price_delta: string }>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<LimitErrorInfo | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["menu", "admin"],
    queryFn: () => menuAdminService.getAdminMenu(),
  });

  const meals = data?.meals ?? [];
  const editingMeal = editingMealId ? meals.find((meal) => meal.id === editingMealId) ?? null : null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["menu", "admin"] });

  const clearPendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }
    setPendingImageFile(null);
    setPendingImagePreview(null);
  };

  const resetMealForm = () => {
    setShowMealForm(false);
    setEditingMealId(null);
    setMealForm(emptyMealForm);
    setGroupForm(defaultGroupForm);
    clearPendingImage();
  };

  const saveMealMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: mealForm.name,
        description: mealForm.description || undefined,
        image_url: mealForm.image_url || undefined,
        base_price: mealForm.base_price ? toNumber(mealForm.base_price) : 0,
        is_active: mealForm.is_active,
      };
      if (editingMealId) {
        return menuAdminService.updateMeal(editingMealId, payload);
      }
      const created = await menuAdminService.createMeal(payload);
      if (pendingImageFile) {
        const uploaded = await menuAdminService.uploadMealImage(created.meal.id, pendingImageFile);
        return uploaded;
      }
      return created;
    },
    onSuccess: (response) => {
      invalidate();
      clearPendingImage();
      if (editingMealId) {
        resetMealForm();
        return;
      }

      const created = response.meal;
      setEditingMealId(created.id);
      setExpandedMealId(created.id);
      setMealForm({
        name: created.name,
        description: created.description ?? "",
        image_url: created.image_url ?? "",
        base_price: String(created.base_price ?? ""),
        is_active: created.is_active,
      });
      setGroupForm(defaultGroupForm);
    },
    onError: (err) => {
      const parsed = parseLimitError(err);
      if (parsed && !editingMealId) {
        setLimitError(parsed);
        setShowLimitModal(true);
      }
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
      setGroupForm(defaultGroupForm);
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
    setEditingMealId(null);
    setMealForm(emptyMealForm);
    setGroupForm(defaultGroupForm);
    clearPendingImage();
    setShowMealForm(true);
  };

  const openEditMeal = (meal: AdminMeal) => {
    setEditingMealId(meal.id);
    setMealForm({
      name: meal.name,
      description: meal.description ?? "",
      image_url: meal.image_url ?? "",
      base_price: String(meal.base_price ?? ""),
      is_active: meal.is_active,
    });
    setGroupForm(defaultGroupForm);
    setExpandedMealId(meal.id);
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

  const extrasHandlers = (mealId: string) => ({
    groupForm,
    onGroupFormChange: setGroupForm,
    onCreateGroup: (name: string, type: "single" | "multiple") =>
      createGroupMutation.mutate({ mealId, name, type }),
    onDeleteGroup: (id: string) => deleteGroupMutation.mutate(id),
    optionForms,
    onOptionFormChange: (groupId: string, field: "name" | "price_delta", value: string) =>
      setOptionForms((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          name: prev[groupId]?.name ?? "",
          price_delta: prev[groupId]?.price_delta ?? "",
          [field]: value,
        },
      })),
    onCreateOption: (groupId: string, name: string, price_delta: number) =>
      createOptionMutation.mutate({ groupId, name, price_delta }),
    onDeleteOption: (id: string) => deleteOptionMutation.mutate(id),
    isCreatingGroup: createGroupMutation.isPending,
    isCreatingOption: createOptionMutation.isPending,
  });

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Menu Management</h1>
            <p className="text-sm text-muted">Meals, option groups, and customizations</p>
          </div>
        </div>
        <div className="backend-header-actions">
          <Button onClick={openCreateMeal}>
            <Plus className="h-4 w-4" />
            Add meal
          </Button>
        </div>
      </header>

      {showMealForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingMealId ? "Edit meal" : "New meal"}</CardTitle>
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
            <div>
              <label className="mb-2 block text-sm font-medium">Upload image</label>
              <input
                type="file"
                accept="image/*"
                disabled={imageUploading || saveMealMutation.isPending}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (editingMealId) {
                    void handleImageUpload(editingMealId, file);
                  } else {
                    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
                    setPendingImageFile(file);
                    setPendingImagePreview(URL.createObjectURL(file));
                    setImageUploadProgress("Image selected — will upload when you create the meal");
                    window.setTimeout(() => setImageUploadProgress(null), 3000);
                  }
                  e.target.value = "";
                }}
              />
              {imageUploadProgress && (
                <p className="mt-1 text-xs text-muted">{imageUploadProgress}</p>
              )}
              {!editingMealId && pendingImageFile && (
                <p className="mt-1 text-xs text-muted">
                  Selected: {pendingImageFile.name} (uploads after create)
                </p>
              )}
            </div>
            {(mealForm.image_url || pendingImagePreview) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mealForm.image_url || pendingImagePreview || ""}
                alt="Meal preview"
                className="h-24 w-24 rounded-lg border border-border object-cover"
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

            {editingMeal ? (
              <MealExtrasEditor meal={editingMeal} {...extrasHandlers(editingMeal.id)} />
            ) : (
              <p className="border-t border-border pt-4 text-sm text-muted">
                Save the meal first, then you can add Extras and other option groups below.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => saveMealMutation.mutate()}
                isLoading={saveMealMutation.isPending}
                disabled={!mealForm.name.trim()}
              >
                {editingMealId ? "Save changes" : "Create meal"}
              </Button>
              <Button variant="secondary" onClick={resetMealForm}>
                {editingMealId ? "Done" : "Cancel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <ResponsiveDataView
          mobile={
            <>
              {isLoading && (
                <p className="py-6 text-center text-sm text-muted">Loading meals…</p>
              )}
              {!isLoading && meals.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">
                  No meals yet — add your first item
                </p>
              )}
              {meals.map((meal) => (
                <MobileDataCard
                  key={meal.id}
                  title={meal.name}
                  subtitle={meal.description || undefined}
                  meta={
                    <Badge variant={meal.is_active ? "secondary" : "outline"}>
                      {meal.is_active ? "Active" : "Inactive"}
                    </Badge>
                  }
                  rows={[
                    { label: "Price", value: formatCurrency(meal.base_price) },
                    { label: "Groups", value: (meal.option_groups ?? []).length },
                  ]}
                  actions={
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEditMeal(meal)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleActiveMutation.mutate(meal)}
                      >
                        {meal.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete "${meal.name}"?`)) {
                            deleteMealMutation.mutate(meal.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setExpandedMealId((id) => (id === meal.id ? null : meal.id))
                        }
                      >
                        {expandedMealId === meal.id ? "Hide extras" : "Extras"}
                      </Button>
                    </>
                  }
                />
              ))}
              {meals.map((meal) =>
                expandedMealId === meal.id ? (
                  <div
                    key={`${meal.id}-extras`}
                    className="rounded-[var(--radius)] border border-border bg-surface-elevated/30 p-4"
                  >
                    <MealExtrasEditor meal={meal} compact {...extrasHandlers(meal.id)} />
                  </div>
                ) : null,
              )}
            </>
          }
        >
          <TableScroll bordered={false}>
            <table className={BACKEND_TABLE_CLASS}>
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
                    extrasEditorProps={extrasHandlers(meal.id)}
                  />
                ))}
              </tbody>
            </table>
          </TableScroll>
        </ResponsiveDataView>
      </Card>

      <UpgradeLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitError={limitError}
      />
    </BackendPage>
  );
}

function MealRow({
  meal,
  expanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
  onDelete,
  extrasEditorProps,
}: {
  meal: AdminMeal;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  extrasEditorProps: Omit<ComponentProps<typeof MealExtrasEditor>, "meal" | "compact">;
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
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{meal.description}</p>
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
            <MealExtrasEditor meal={meal} compact {...extrasEditorProps} />
          </td>
        </tr>
      )}
    </>
  );
}
