// useInventory — fetches from /api/inventory (Vercel function, no Railway needed)
import { useEffect, useState } from "react";

export interface InventoryProduct {
  itemCode: string;
  name: string;
  brand?: string;
  sku: string;
  size: string;
  sellingPrice: number;
  srp: number;
  status: string;
  imageUrl: string;
  productsUrl: string;
  discount: number;
}

interface InventoryState {
  data: InventoryProduct[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

let _cache: InventoryProduct[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;
const _listeners: Set<() => void> = new Set();

async function fetchInventory(): Promise<InventoryProduct[]> {
  const res = await fetch("/api/inventory");
  if (!res.ok) throw new Error(`Inventory fetch failed: ${res.status}`);
  const data = await res.json();
  return data.products || [];
}

export async function refreshInventory(): Promise<{ count: number }> {
  _cacheTime = 0;
  _cache = null;
  const products = await fetchInventory();
  _cache = products;
  _cacheTime = Date.now();
  _listeners.forEach(fn => fn());
  return { count: products.length };
}

export function useInventory(): InventoryState {
  const [data, setData] = useState<InventoryProduct[] | null>(_cache);
  const [isLoading, setIsLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    const now = Date.now();
    if (!force && _cache && now - _cacheTime < CACHE_TTL) {
      setData(_cache);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const products = await fetchInventory();
      _cache = products;
      _cacheTime = Date.now();
      setData(products);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const notify = () => setData(_cache);
    _listeners.add(notify);
    load();
    return () => { _listeners.delete(notify); };
  }, []);

  return { data, isLoading, error, refetch: () => load(true) };
}
