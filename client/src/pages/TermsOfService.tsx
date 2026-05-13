export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="bg-[#050f12] px-6 py-14 text-center">
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3">SoleBlessing</p>
        <h1 className="text-4xl font-black text-white">Terms of Service</h1>
        <p className="text-white/40 text-xs mt-3">Last updated: May 2026</p>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: "1. Acceptance", content: "By placing an order on SoleBlessing (soleblessingofficial.com), you agree to these Terms of Service. If you do not agree, please do not use our services." },
          { title: "2. Products & Authenticity", content: "All products sold on SoleBlessing are 100% authentic. We source directly from authorized distributors and verified sellers. Every item undergoes an authenticity check before shipping. We stand fully behind our products." },
          { title: "3. Ordering & Payment", content: "Orders are confirmed only upon receipt and verification of payment. We accept GCash, Maya, BDO/BPI bank transfer, and Cash on Delivery (select areas). SoleBlessing reserves the right to cancel any order at our discretion, with full refund provided." },
          { title: "4. Pricing", content: "All prices are in Philippine Peso (₱) and include VAT where applicable. Prices may change without notice. The price at time of order placement is the final price. We are not responsible for pricing errors — we will contact you if an error affects your order." },
          { title: "5. Shipping & Delivery", content: "Estimated delivery times are provided as a guide and are not guaranteed. SoleBlessing is not liable for delays caused by third-party couriers, weather, or force majeure events. Risk of loss transfers to the buyer upon handover to the courier." },
          { title: "6. Returns & Exchanges", content: "Please refer to our Returns & Exchanges Policy for full details. All returns must be pre-approved. Unauthorized returns will not be processed. Items must be in original, unworn condition." },
          { title: "7. Intellectual Property", content: "All content on this website — including logos, images, text, and design — is owned by TYG Services / SoleBlessing. You may not reproduce, distribute, or use our content without written permission." },
          { title: "8. Limitation of Liability", content: "SoleBlessing's liability for any order is limited to the total purchase price of that order. We are not liable for indirect, incidental, or consequential damages arising from the use of our products or services." },
          { title: "9. Governing Law", content: "These Terms are governed by the laws of the Republic of the Philippines. Any disputes shall be subject to the exclusive jurisdiction of Philippine courts." },
          { title: "10. Changes to Terms", content: "We may update these terms at any time. Continued use of our services after changes constitutes acceptance. For questions, contact tygfsb@gmail.com." },
        ].map(s => (
          <div key={s.title} className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-base font-black text-[#0d2430] mb-3">{s.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
