import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { buildItems } from "@/lib/catalog";
import type { Product, ShopConfig } from "@/lib/shop";

export function useProducts() {
  const q = useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products"), staleTime: 60_000 });
  const products = useMemo(() => q.data ?? [], [q.data]);
  const items = useMemo(() => buildItems(products), [products]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  return { ...q, products, items, byId };
}

/** UPI id comes from the backend (UPI_ID env var). Empty = UPI not set up, so we don't offer it. */
export function useShopConfig() {
  return useQuery({ queryKey: ["config"], queryFn: () => apiGet<ShopConfig>("/config"), staleTime: 5 * 60_000, retry: 1 });
}

export function usePageTitle(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
}
