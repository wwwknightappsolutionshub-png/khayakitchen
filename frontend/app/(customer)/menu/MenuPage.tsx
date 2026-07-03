"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MenuCard } from "@/components/customer/MenuCard";
import { MealCustomizeFlow } from "@/components/customer/MealCustomizeFlow";
import { SocialProof } from "@/components/customer/SocialProof";
import { useMenu } from "@/hooks/useMenu";
import type { Meal } from "@/lib/types";

function MenuCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="customer-shimmer aspect-video w-full" />
      <div className="space-y-2 p-4">
        <div className="customer-shimmer h-5 w-2/3 rounded" />
        <div className="customer-shimmer h-4 w-full rounded" />
        <div className="customer-shimmer h-5 w-16 rounded" />
      </div>
    </div>
  );
}

export default function MenuPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("meal");
  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);
  const { data, isLoading, error } = useMenu();

  const meals = data?.meals ?? [];

  return (
    <div className="customer-animate-in px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
        <SocialProof className="mt-2" />
      </header>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
          <p className="text-[var(--muted)]">Could not load menu.</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Check your connection and try again.</p>
        </div>
      )}

      <div className="space-y-4">
        {meals.map((meal, index) => (
          <MenuCard
            key={meal.id}
            meal={meal}
            onSelect={setCustomizingMeal}
            highlighted={highlightId === meal.id}
            priority={index < 2}
          />
        ))}
      </div>

      {customizingMeal && (
        <MealCustomizeFlow meal={customizingMeal} onClose={() => setCustomizingMeal(null)} />
      )}
    </div>
  );
}
