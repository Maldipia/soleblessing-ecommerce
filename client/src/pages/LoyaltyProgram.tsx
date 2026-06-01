import { useState, useEffect } from "react";
import { Trophy, Gift, Zap, Crown, TrendingUp, Search, Phone, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (c: number) => `₱${(c / 100).toLocaleString("en-PH")}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const TIERS = [
  { id: "bronze", label: "Bronze",   icon: Trophy, min: 0,     max: 999,   color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", pts: "1 pt per ₱100",     perks: ["Birthday bonus: 100 pts", "Member discounts"] },
  { id: "silver", label: "Silver",   icon: Gift,   min: 1000,  max: 4999,  color: "text-gray-600",   bg: "bg-gray-50",    border: "border-gray-200",   pts: "1.5 pts per ₱100",  perks: ["Early sale access 24h", "Birthday bonus: 200 pts"] },
  { id: "gold",   label: "Gold",     icon: Zap,    min: 5000,  max: 9999,  color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-200", pts: "2 pts per ₱100",    perks: ["Early sale access 48h", "Priority support", "Birthday bonus: 500 pts"] },
  { id: "vip",    label: "VIP",      icon: Crown,  min: 10000, max: Infinity, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", pts: "3 pts per ₱100", perks: ["Free shipping always", "Exclusive drops", "Personal stylist", "Birthday bonus: 1000 pts"] },
];

function getTier(points: number) {
  return TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0];
}

function getNextTier(points: number) {
  const idx = TIERS.findIndex(t => points >= t.min && points <= t.max);
  return TIERS[idx + 1] || null;
}

export default function LoyaltyProgram() {
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinForm, setJoinForm] = useState({ name: "", phone: "", email: "" });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = phone.trim().replace(/\s/g, "");
    if (!num) return;
    setSearching(true); setError(""); setMember(null);
    try {
      const r = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", phone: num }),
      });
      const data = r.ok ? await r.json() : { member: null, transactions: [] };
      if (!data.member) {
        setError("No loyalty account found for this number. Join below!");
      } else {
        setMember(data.member);
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      }
    } catch { setError("Something went wrong. Try again."); }
    finally { setSearching(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinForm.name || !joinForm.phone) { toast.error("Name and phone are required"); return; }
    setJoining(true);
    try {
      const r = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name: joinForm.name.trim(), phone: joinForm.phone.trim(), email: joinForm.email.trim() }),
      });
      if (r.status === 409) { toast.error("This number is already registered!"); return; }
      if (!r.ok) { toast.error("Failed to join. Please try again."); return; }
      const data = await r.json();
      toast.success("Welcome to SoleBlessing Loyalty! 🎉");
      setPhone(joinForm.phone.trim());
      if (data.member) setMember(data.member);
      setJoinForm({ name: "", phone: "", email: "" });
    } catch(e: any) {
      toast.error("Failed to join. Please try again.");
    } finally { setJoining(false); }
  };

  const currentTier = member ? getTier(member.points) : null;
  const nextTier = member ? getNextTier(member.points) : null;
  const progress = member && nextTier
    ? ((member.points - currentTier!.min) / (nextTier.min - currentTier!.min)) * 100
    : 100;

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      {/* Hero */}
      <div className="bg-[#050f12] px-6 py-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #C9A84C 0%, transparent 50%), radial-gradient(circle at 70% 50%, #C9A84C 0%, transparent 50%)" }} />
        <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[#C9A84C] mb-3 relative">SoleBlessing</p>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3 relative">Sole Rewards</h1>
        <p className="text-white/40 text-sm max-w-md mx-auto relative">
          Earn points every purchase. Unlock exclusive perks. The more you shop, the more you save.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Lookup form */}
        <form onSubmit={handleSearch} className="bg-white border border-gray-100 rounded-2xl p-6">
          <label className="text-xs font-bold tracking-[.12em] uppercase text-gray-500 block mb-3">
            Check Your Points
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={phone} onChange={e => { setPhone(e.target.value); setError(""); }}
                placeholder="09XX-XXX-XXXX"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0d2430] transition-colors" />
            </div>
            <button type="submit" disabled={searching || !phone.trim()}
              className="bg-[#0d2430] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#122d3a] disabled:opacity-40 transition-all flex items-center gap-2">
              <Search className="h-4 w-4" /> {searching ? "…" : "Look Up"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-3 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}
        </form>

        {/* Member card */}
        {member && currentTier && (
          <div className="space-y-4">
            <div className={`${currentTier.bg} border ${currentTier.border} rounded-2xl p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">{currentTier.label} Member</p>
                  <h2 className="text-2xl font-black text-[#0d2430]">{member.customer_name}</h2>
                  <p className="text-xs text-gray-400">{member.contact_number}</p>
                </div>
                <div className={`w-14 h-14 ${currentTier.bg} border-2 ${currentTier.border} rounded-full flex items-center justify-center`}>
                  <currentTier.icon className={`h-7 w-7 ${currentTier.color}`} />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-500">Points Balance</span>
                  <span className="text-xs text-gray-400">
                    {nextTier ? `${nextTier.min - member.points} pts to ${nextTier.label}` : "Max tier reached 👑"}
                  </span>
                </div>
                <div className="text-3xl font-black text-[#0d2430] mb-3">
                  {member.points.toLocaleString()} <span className="text-sm font-semibold text-gray-400">pts</span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${currentTier.color.replace("text-","bg-")}`}
                    style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">{currentTier.label} Perks</p>
                <div className="space-y-1">
                  {currentTier.perks.map(p => (
                    <div key={p} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className={`h-3.5 w-3.5 ${currentTier.color} flex-shrink-0`} />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions */}
            {transactions.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d2430] mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#C9A84C]" /> Points History
                </h3>
                <div className="divide-y divide-gray-50">
                  {transactions.map(t => (
                    <div key={t.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-[#0d2430]">{t.description || t.order_number}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(t.created_at)}</p>
                      </div>
                      <span className={`text-sm font-black ${t.points_earned > 0 ? "text-green-600" : "text-red-500"}`}>
                        {t.points_earned > 0 ? "+" : ""}{t.points_earned > 0 ? t.points_earned : -t.points_redeemed} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tier overview */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430] mb-5">Membership Tiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIERS.map(t => (
              <div key={t.id} className={`${t.bg} border ${t.border} rounded-xl p-4 text-center`}>
                <t.icon className={`h-6 w-6 ${t.color} mx-auto mb-2`} />
                <p className={`text-xs font-black uppercase tracking-wider ${t.color}`}>{t.label}</p>
                <p className="text-[10px] text-gray-500 mt-1">{t.min.toLocaleString()}+ pts</p>
                <p className={`text-[10px] font-bold mt-1 ${t.color}`}>{t.pts}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-[#050f12] rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-5">How to Earn Points</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "🛍️", title: "Every Purchase", desc: "Earn points for every peso you spend. More you spend, more you earn." },
              { icon: "🎂", title: "Birthday Bonus", desc: "Get bonus points on your birthday based on your tier level." },
              { icon: "📦", title: "After Delivery", desc: "Points are credited once your order is marked as delivered." },
            ].map(s => (
              <div key={s.title} className="bg-white/[.05] rounded-xl p-4">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#C9A84C]/10 rounded-xl border border-[#C9A84C]/20">
            <p className="text-xs text-[#C9A84C] leading-relaxed">
              <strong>Redemption:</strong> 100 points = ₱50 discount on your next order. Use your points at checkout — just enter your phone number!
            </p>
          </div>
        </div>

        {/* Join form */}
        {!member && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d2430] mb-1">Join Sole Rewards</h3>
            <p className="text-xs text-gray-400 mb-5">Sign up free. Start earning points on your next order.</p>
            <form onSubmit={handleJoin} className="space-y-4">
              {[
                { label: "Full Name *", key: "name", placeholder: "Juan dela Cruz", type: "text" },
                { label: "Phone Number *", key: "phone", placeholder: "09XX-XXX-XXXX", type: "tel" },
                { label: "Email (optional)", key: "email", placeholder: "email@example.com", type: "email" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">{f.label}</label>
                  <input type={f.type} value={(joinForm as any)[f.key]}
                    onChange={e => setJoinForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#0d2430]" />
                </div>
              ))}
              <button type="submit" disabled={joining}
                className="w-full bg-[#C9A84C] text-[#050f12] py-3 text-sm font-black tracking-wide uppercase rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                {joining ? "Joining…" : "Join Now — It's Free!"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
