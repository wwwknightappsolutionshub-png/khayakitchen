import type { MealOption, MealOptionGroup } from "./types";

export function getRadioOptionGroups(groups: MealOptionGroup[]): MealOptionGroup[] {
  return groups.filter(
    (g) =>
      g.type === "single" ||
      /protein|spice/i.test(g.group),
  );
}

export function getCheckboxOptionGroups(groups: MealOptionGroup[]): MealOptionGroup[] {
  return groups.filter(
    (g) =>
      g.type === "multiple" ||
      /extra|add-on|addon/i.test(g.group),
  );
}

export function isRadioGroup(group: MealOptionGroup): boolean {
  return group.type === "single" || /protein|spice/i.test(group.group);
}

export function optionsTotal(selected: MealOption[]): number {
  return selected.reduce((sum, o) => sum + Number(o.price_delta || 0), 0);
}
