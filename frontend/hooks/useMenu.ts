import { useQuery } from "@tanstack/react-query";
import { menuService } from "@/services/menu.service";

export function useMenu() {
  return useQuery({
    queryKey: ["menu"],
    queryFn: () => menuService.getMenu(),
    retry: 1,
    staleTime: 60_000,
  });
}
