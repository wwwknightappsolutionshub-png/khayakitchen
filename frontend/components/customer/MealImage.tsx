"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getMealImageUrl } from "@/lib/meal-images";

interface MealImageProps {
  name: string;
  imageUrl?: string | null;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function MealImage({ name, imageUrl, className, sizes = "80px", priority }: MealImageProps) {
  const [failed, setFailed] = useState(false);
  const src = getMealImageUrl(name, imageUrl);

  if (failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-2xl",
          className,
        )}
        aria-hidden
      >
        🍽️
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-surface-elevated", className)}>
      <Image
        src={src}
        alt={name}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
