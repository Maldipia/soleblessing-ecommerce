import { useInventory } from "@/hooks/useInventory";
import ProductCardV2 from "@/components/ProductCardV2";
import { useLocation } from "wouter";
import { useMemo } from "react";


export default function LastPairSection() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useInventory();

  const items = useMemo(() => {
    if (!data) return [];
    // Deduplicate: one entry per SKU, pick the item with best discount
    const seen = new Map<string,any>();
    data.forEach((item:any) => {
      if (!item.imageUrl) return; // hide products without a photo for now
      const existing = seen.get(item.sku);
      if (!existing || item.discount > existing.discount) seen.set(item.sku, item);
    });
    const unique = Array.from(seen.values());
    // Last pairs: SKUs where only 1 unit exists across ALL raw data
    const skuCount = new Map<string,number>();
    data.forEach((p:any) => skuCount.set(p.sku, (skuCount.get(p.sku)||0)+1));
    return unique.filter((p:any)=>(skuCount.get(p.sku)||0)===1).slice(0,12);
  }, [data]);

  if (isLoading) return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
      {[...Array(4)].map((_,i) => (
        <div key={i} className="w-[172px] md:w-56 flex-shrink-0 bg-white rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-[#f0f0ef]"/>
          <div className="p-3 space-y-2"><div className="h-3 bg-[#f0f0ef] rounded w-2/3"/><div className="h-4 bg-[#f0f0ef] rounded"/></div>
        </div>
      ))}
    </div>
  );
  if (!items.length) return <p className="text-sm text-gray-400 py-4">No items yet.</p>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
      {items.map((p: any) => (
        <ProductCardV2 key={p.sku} p={p} badge={"LAST PAIR"} onClick={()=>setLocation(`/inventory/${p.itemCode}`)}/>
      ))}
    </div>
  );
}
