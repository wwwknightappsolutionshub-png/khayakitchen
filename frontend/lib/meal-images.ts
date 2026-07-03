/**
 * Public food photography (Unsplash) mapped to pilot menu items.
 * Sources: https://unsplash.com — free to use under Unsplash License.
 */
const MEAL_IMAGE_BY_NAME: Record<string, string> = {
  "jollof rice":
    "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80",
  "egusi soup":
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80",
  "suya skewers":
    "https://images.pexels.com/photos/36323856/pexels-photo-36323856.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "pounded yam":
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80",
  "fried plantain":
    "https://images.pexels.com/photos/6210449/pexels-photo-6210449.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
};

const DEFAULT_MEAL_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80";

export function getMealImageUrl(mealName: string, imageUrl?: string | null): string {
  const key = mealName.trim().toLowerCase();
  const mapped = MEAL_IMAGE_BY_NAME[key];
  if (mapped) return mapped;
  if (imageUrl) return imageUrl;
  return DEFAULT_MEAL_IMAGE;
}
