"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { AdminMeal, AdminOptionGroup } from "@/lib/types";
import { formatCurrency, toNumber } from "@/lib/utils";

export interface MealExtrasEditorProps {
  meal: AdminMeal;
  groupForm: { name: string; type: "single" | "multiple" };
  onGroupFormChange: (form: { name: string; type: "single" | "multiple" }) => void;
  onCreateGroup: (name: string, type: "single" | "multiple") => void;
  onDeleteGroup: (id: string) => void;
  optionForms: Record<string, { name: string; price_delta: string }>;
  onOptionFormChange: (groupId: string, field: "name" | "price_delta", value: string) => void;
  onCreateOption: (groupId: string, name: string, price_delta: number) => void;
  onDeleteOption: (id: string) => void;
  isCreatingGroup?: boolean;
  isCreatingOption?: boolean;
  compact?: boolean;
}

const EXTRAS_GROUP_PATTERN = /extra|add-on|addon/i;

export function MealExtrasEditor({
  meal,
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
  compact = false,
}: MealExtrasEditorProps) {
  const groups = meal.option_groups ?? [];
  const hasExtrasGroup = groups.some((group) => EXTRAS_GROUP_PATTERN.test(group.name) || group.type === "multiple");

  const handleQuickExtrasGroup = () => {
    onCreateGroup("Extras", "multiple");
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4 border-t border-border pt-4"}>
      <div>
        <p className="text-sm font-medium">Extras &amp; add-ons</p>
        <p className="mt-1 text-xs text-muted">
          Optional choices customers can add when ordering this meal. Groups named &quot;Extras&quot; or set to
          &quot;Multiple choice&quot; appear in the customer home &quot;Popular add-ons&quot; section.
        </p>
      </div>

      {!hasExtrasGroup && (
        <Button type="button" size="sm" variant="secondary" onClick={handleQuickExtrasGroup} isLoading={isCreatingGroup}>
          <Plus className="h-4 w-4" />
          Add Extras group
        </Button>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-muted">No option groups yet — add an Extras group or create a custom group below.</p>
      ) : null}

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
          placeholder="e.g. Size, Sides, Extras"
          value={groupForm.name}
          onChange={(e) => onGroupFormChange({ ...groupForm, name: e.target.value })}
          className="w-full min-w-0 sm:min-w-[160px] flex-1"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium">Selection type</label>
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
            <option value="multiple">Multiple choice (add-ons)</option>
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => onCreateGroup(groupForm.name, groupForm.type)}
          isLoading={isCreatingGroup}
          disabled={!groupForm.name.trim()}
        >
          Add group
        </Button>
      </div>
    </div>
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
  isCreatingOption?: boolean;
}) {
  const options = group.options ?? [];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{group.name}</span>
          <Badge variant="outline" className="capitalize">
            {group.type === "multiple" ? "Multiple (add-ons)" : "Single choice"}
          </Badge>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onDeleteGroup} aria-label="Delete group">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="mb-2 space-y-1">
        {options.length === 0 ? (
          <li className="text-sm text-muted">No options in this group yet.</li>
        ) : (
          options.map((opt) => (
            <li key={opt.id} className="flex items-center justify-between text-sm">
              <span>
                {opt.name}
                {toNumber(opt.price_delta) !== 0 && (
                  <span className="ml-2 font-mono text-muted">+{formatCurrency(opt.price_delta)}</span>
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
          ))
        )}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Option name (e.g. Extra cheese)"
          value={optionForm.name}
          onChange={(e) => onOptionFormChange("name", e.target.value)}
          className="min-w-[120px] flex-1"
        />
        <Input
          placeholder="Price +£"
          type="number"
          step="0.01"
          min="0"
          value={optionForm.price_delta}
          onChange={(e) => onOptionFormChange("price_delta", e.target.value)}
          className="w-24"
        />
        <Button
          type="button"
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
