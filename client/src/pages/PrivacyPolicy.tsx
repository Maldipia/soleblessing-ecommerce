export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="bg-[#050f12] px-6 py-14 text-center">
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3">SoleBlessing</p>
        <h1 className="text-4xl font-black text-white">Privacy Policy</h1>
        <p className="text-white/40 text-xs mt-3">Last updated: May 2026</p>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-sm text-gray-600 leading-relaxed">
        {[
          { title: "📋 Information We Collect", content: "When you place an order or contact us, we collect:\n\n• Full name and contact number\n• Email address (optional)\n• Shipping address\n• Payment reference (screenshot/reference number only — we do not store card numbers)\n• Order history and preferences" },
          { title: "🎯 How We Use Your Information", content: "We use your information to:\n\n• Process and fulfill your orders\n• Send order status updates via SMS or Messenger\n• Manage your Sole Rewards loyalty account\n• Respond to inquiries and support requests\n• Improve our products and services\n\nWe do not sell or rent your personal data to third parties." },
          { title: "🔒 Data Security", content: "Your data is stored securely in encrypted databases. Payment proofs are stored in private Google Drive folders accessible only to authorized SoleBlessing staff. We use HTTPS for all data transmission. We regularly review our data practices to ensure your information is protected." },
          { title: "📱 Cookies", content: "Our website uses minimal cookies to remember your cart and preferences during your browsing session. We do not use tracking cookies for advertising. You can clear your browser cookies at any time without affecting your ability to use our site." },
          { title: "👥 Data Sharing", content: "We share your delivery information (name, address, phone) with our courier partners (J&T, LBC, Lalamove) solely for the purpose of delivering your order. We do not share your data with advertisers or data brokers." },
          { title: "✏️ Your Rights", content: "Under Philippine law (Data Privacy Act of 2012), you have the right to:\n\n• Know what personal data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your data\n• Withdraw consent\n\nTo exercise these rights, email tygfsb@gmail.com." },
          { title: "📞 Contact", content: "For privacy concerns, contact:\nTYG Services / SoleBlessing\nAmadeo, Cavite, Philippines\nEmail: tygfsb@gmail.com\nFacebook: facebook.com/SoleBlessingPH" },
        ].map(s => (
          <div key={s.title} className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="text-base font-black text-[#0d2430] mb-3">{s.title}</h2>
            {s.content.split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('•') ? "ml-4 text-sm text-gray-600 mb-1" : "text-sm text-gray-600 mb-1"}>{line}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
