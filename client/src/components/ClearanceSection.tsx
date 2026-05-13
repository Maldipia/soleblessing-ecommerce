import { useInventory } from "@/hooks/useInventory";
import { useLocation } from "wouter";
import { useMemo } from "react";

function fmt(c: number): string {
  return "\u20b1" + (c / 100).toLocaleString("en-PH");
}

function ProductCard({ p, onClick }: { p: any; onClick: () => void }) {
  const price = p.sellingPrice || p.srp || 0;
  const origPrice = p.srp || 0;
  const onSale = p.sellingPrice > 0 && origPrice > p.sellingPrice;
  return (
    <div onClick={onClick} className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex-shrink-0 w-48 md:w-56">
      <div className="relative aspect-square bg-[#EDE9E3] overflow-hidden">
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">👟</div>}
        {p.discount > 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-{p.discount}%</span>}
      </div>
      <div className="p-3">
        <p className="text-[9px] font-bold tracking-widest uppercase text-[#C9A84C] mb-0.5">{p.sku}</p>
        <p className="text-xs font-bold text-[#0d2430] leading-tight line-clamp-2 mb-1.5">{p.name}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-[#0d2430]">{fmt(price)}</span>
          {onSale && <span className="text-[10px] text-gray-400 line-through">{fmt(origPrice)}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ClearanceSection() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useInventory();

  const items = useMemo(() => {
    if (!data) return [];
    return data.filter((p:any)=>p.discount>=30).sort((a:any,b:any)=>b.discount-a.discount).slice(0,12);
  }, [data]);

  if (isLoading) return (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="w-48 md:w-56 flex-shrink-0 bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100"/>
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-2/3"/>
                <div className="h-4 bg-gray-100 rounded"/>
              </div>
            </div>
          ))}
        </div>
  );
  if (!items.length) return <p className="text-sm text-gray-400 py-4">No items yet.</p>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
      {items.map((p: any) => (
        <ProductCard key={p.itemCode} p={p} onClick={()=>setLocation(`/inventory/${p.itemCode}`)}/>
      ))}
    </div>
  );
}
