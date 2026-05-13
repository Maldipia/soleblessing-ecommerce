export default function ReturnsPolicy() {
  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="bg-[#050f12] px-6 py-14 text-center">
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3">SoleBlessing</p>
        <h1 className="text-4xl font-black text-white">Returns & Exchanges</h1>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: "✅ What We Accept", content: "We accept returns and exchanges within 7 days of delivery for:\n\n• Wrong item received (incorrect size, colorway, or model)\n• Item arrived with manufacturing defect\n• Item arrived damaged during shipping\n\nAll items must be unworn, in original box, with all original tags intact." },
          { title: "❌ What We Don't Accept", content: "We do not accept returns or exchanges for:\n\n• Change of mind or wrong size ordered\n• Items showing signs of wear or use\n• Items without original packaging\n• Sale or clearance items\n• Items reported after 7 days of delivery" },
          { title: "🔁 Exchange Policy", content: "Exchanges are subject to stock availability. If your desired size or colorway is not available, we will issue a store credit valid for 30 days. We cover shipping for exchanges due to our error (wrong item sent). Customer shoulders shipping for size exchange requests." },
          { title: "📋 How to Request a Return", content: "1. Message us on Facebook or email tygfsb@gmail.com within 7 days of delivery.\n2. Include your order number and photo/video of the issue.\n3. Wait for return approval (we respond within 24 hours).\n4. Ship the item back to our address once approved.\n5. Refund or exchange will be processed within 3–5 business days of receiving the item." },
          { title: "💰 Refund Method", content: "Approved refunds are processed via GCash, Maya, or bank transfer — whichever is most convenient for you. Shipping fees are non-refundable unless the return is due to our error. Refunds take 3–5 business days to reflect." },
          { title: "🔐 Authenticity Guarantee", content: "Every item sold on SoleBlessing is 100% authentic. If you receive an item you believe is not authentic, contact us immediately with evidence. We take authenticity seriously and will resolve any such issue immediately." },
        ].map(s => (
          <div key={s.title} className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-base font-black text-[#0d2430] mb-3">{s.title}</h2>
            {s.content.split('\n').map((line, i) => (
              <p key={i} className={line.match(/^\d\./) || line.startsWith('•') ? "ml-4 text-sm text-gray-600 mb-1" : "text-sm text-gray-600 mb-1"}>{line}</p>
            ))}
          </div>
        ))}
        <div className="bg-[#050f12] rounded-2xl p-6 text-center">
          <p className="text-white/60 text-sm mb-2">Need to process a return?</p>
          <p className="text-[#C9A84C] font-bold">Email: <span className="underline">tygfsb@gmail.com</span></p>
        </div>
      </div>
    </div>
  );
}
