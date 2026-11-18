// SB2.0 shared product card — white, rounded, badges, orange discount accent.
// Used by the homepage scrollers; grid pages carry their own wishlist variant.
export const fmtPeso = (c: number) => "₱" + Math.round((c || 0) / 100).toLocaleString("en-PH");

export default function ProductCardV2({ p, onClick, badge }: { p: any; onClick: () => void; badge?: string }) {
  const price = p.sellingPrice || p.srp || 0;
  const origPrice = p.srp || 0;
  const onSale = p.sellingPrice > 0 && origPrice > p.sellingPrice;
  const tag = badge || (onSale ? "SALE" : undefined);
  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-[#f0f0ef] hover:shadow-[0_14px_34px_rgba(0,0,0,.1)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group flex-shrink-0 w-[172px] md:w-56">
      <div className="relative aspect-square bg-[#f6f6f5] overflow-hidden">
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">👟</div>}
        {tag && (
          <span className={`absolute top-2 left-2 text-[8.5px] font-black tracking-[.08em] px-2 py-1 rounded-full ${
            tag === "SALE" ? "bg-[#FF5A1F] text-white" :
            tag === "LAST PAIR" ? "bg-white text-[#0a0a0a] border border-[#0a0a0a]" :
            "bg-[#0a0a0a] text-white"}`}>
            {tag}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[8.5px] font-black tracking-[.14em] uppercase text-[#9b9b98] mb-0.5">{p.brand || p.sku}</p>
        <p className="text-[12.5px] font-bold text-[#0a0a0a] leading-tight truncate mb-1.5">{p.name}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-[#0a0a0a]">{fmtPeso(price)}</span>
          {onSale && <>
            <span className="text-[10px] text-[#b3b3b0] line-through">{fmtPeso(origPrice)}</span>
            <span className="text-[9.5px] font-black text-[#FF5A1F]">-{p.discount}%</span>
          </>}
        </div>
      </div>
    </div>
  );
}
