export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="bg-[#050f12] px-6 py-14 text-center">
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3">SoleBlessing</p>
        <h1 className="text-4xl font-black text-white">Shipping Policy</h1>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: "📦 Processing Time", content: "Orders are processed within 1–2 business days after payment confirmation. Orders placed on weekends or holidays are processed on the next business day. You will receive a notification once your order is packed and handed to the courier." },
          { title: "🚚 Delivery Timeframes", content: `Once shipped, estimated delivery times are:\n\n• Metro Manila: 1–2 business days\n• Luzon (outside NCR): 2–4 business days\n• Visayas & Mindanao: 3–6 business days\n• Delivery to remote areas may take longer. Timeframes are estimates and not guaranteed — delays may occur due to weather, holidays, or high-volume periods.` },
          { title: "💸 Shipping Rates", content: "Flat rate shipping applies to all orders. FREE shipping is available on orders ₱3,000 and above. COD (Cash on Delivery) is available for most areas — confirm availability at checkout." },
          { title: "📬 Order Tracking", content: "Once your order is shipped, a tracking number from J&T, LBC, or Lalamove will be sent to your contact number. Use this to monitor your delivery. You can also track your order on this website using your order number." },
          { title: "⚠️ Incorrect Address", content: "Please double-check your shipping address before placing your order. SoleBlessing is not responsible for failed deliveries due to incorrect or incomplete addresses. Re-shipping fees apply for returned packages." },
          { title: "📍 Courier Partners", content: "We ship via J&T Express, LBC, Lalamove, and Grab Express. The courier may vary depending on your location and availability. For in-Metro Manila orders, same-day or next-day delivery may be available via Lalamove." },
        ].map(s => (
          <div key={s.title} className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-base font-black text-[#0d2430] mb-3">{s.title}</h2>
            {s.content.split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('•') ? "ml-4 text-sm text-gray-600" : "text-sm text-gray-600 mb-1"}>{line}</p>
            ))}
          </div>
        ))}
        <div className="bg-[#050f12] rounded-2xl p-6 text-center">
          <p className="text-white/60 text-sm mb-2">Questions about your shipment?</p>
          <p className="text-[#C9A84C] font-bold">Message us on Facebook: <span className="underline">facebook.com/SoleBlessingPH</span></p>
        </div>
      </div>
    </div>
  );
}
