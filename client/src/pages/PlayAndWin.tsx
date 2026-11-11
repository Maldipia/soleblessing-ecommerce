// SoleBlessing Shoe Cleaner — "Play & Win" campaign landing page.
// Public page reached from the QR on printed vouchers. Content comes from
// sc_content via /api/shoe-cleaner (op: config); registration is validated
// server-side and atomically in Postgres (sc_register).
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

type Cfg = {
  ok: boolean;
  campaign?: { name: string; ends_on: string; discount_pct: number };
  content?: Record<string, string>;
  winners?: { period?: string; name?: string }[];
};

const ERRORS: Record<string, string> = {
  not_found: "Voucher number not found. Please check the number printed on your voucher.",
  already_registered: "This voucher has already been used.",
  voided: "This voucher is no longer valid.",
  expired: "This voucher has expired.",
  expired_campaign: "This promo has ended.",
  privacy_required: "Please agree to the Privacy Notice to continue.",
  missing_fields: "Please fill in your name, email, contact number and voucher number.",
  bad_email: "Please enter a valid email address.",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  no_campaign: "This promo is not active right now.",
};

export default function PlayAndWin() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", profession: "", code: "", privacy: false, marketing: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ ref: string; discount_code: string; pct: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/shoe-cleaner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "config" }) })
      .then(r => r.json()).then(setCfg).catch(() => setCfg({ ok: false }));
  }, []);

  const c = cfg?.content || {};
  const pct = cfg?.campaign?.discount_pct ?? 15;
  const features = (c.features || "").split("|").filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!f.privacy) { setErr(ERRORS.privacy_required); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/shoe-cleaner", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "register", ...f }),
      });
      const out = await r.json();
      if (out.ok) { setDone(out); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else setErr(ERRORS[out.error] || "Something went wrong. Please try again.");
    } catch { setErr("Network problem — please try again."); }
    setBusy(false);
  }

  const inp = "w-full bg-white/[.06] border border-white/[.12] rounded px-4 py-3 text-white text-sm outline-none focus:border-[#F2762E] transition-colors placeholder-white/25";
  const lbl = "block text-[10px] font-bold tracking-[.14em] uppercase text-white/40 mb-1.5 mt-4";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* HERO */}
      <section className="relative overflow-hidden text-center px-5 pt-10 pb-8"
        style={{ background: "radial-gradient(120% 80% at 80% -10%, rgba(242,118,46,.28), transparent 60%), #0a0a0a" }}>
        <div className="font-black tracking-[.2em] uppercase text-sm">SOLE<span className="text-[#F2762E]">BLESSING</span></div>
        <div className="text-[10px] tracking-[.22em] uppercase text-white/35 mt-1">Special offer for pickleball players</div>
        <h1 className="font-black uppercase leading-[1.02] text-4xl sm:text-5xl mt-5" style={{ letterSpacing: ".01em" }}>
          Play &amp; Win<br /><span className="text-[#F2762E]">with SoleBlessing!</span>
        </h1>
        <p className="text-white/55 text-sm max-w-md mx-auto mt-3 leading-relaxed">
          {c.subhead || "Keep your shoes fresh and clean. Register your voucher for a chance to win a FREE SoleBlessing Shoe Essential Kit."}
        </p>
        <img src={c.hero_img || "/shoe-cleaner/kit-hero.jpg"} alt="SoleBlessing Shoe Essential Kit"
          className="mx-auto mt-6 w-56 rounded-xl shadow-[0_24px_60px_rgba(242,118,46,.25)]" />
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {[`${pct}% OFF`, "Monthly raffle", "Until Dec 31, 2027"].map(t => (
            <span key={t} className="text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full border border-[#F2762E]/50 text-[#F2762E]">{t}</span>
          ))}
        </div>
        <button onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="mt-6 w-full max-w-md bg-[#F2762E] text-black font-black uppercase tracking-[.14em] py-3.5 rounded hover:opacity-90">
          Register now
        </button>
      </section>

      {/* SUCCESS banner replaces form content after registering */}
      {done && (
        <section className="px-5 py-8 max-w-md mx-auto">
          <div className="border border-emerald-500/40 bg-emerald-500/10 rounded-xl p-5">
            <div className="font-black uppercase tracking-wide text-emerald-400 text-xl">Registration successful!</div>
            <p className="text-white/70 text-sm mt-2 leading-relaxed">
              Your voucher is registered. You're in this month's Shoe Essential Kit raffle — and your {done.pct}% discount is ready to use, win or lose.
            </p>
            <div className="mt-4 text-sm bg-white/[.06] border border-white/[.12] rounded p-3">
              <div className="flex justify-between"><span className="text-white/45">Reference</span><b>{done.ref}</b></div>
              <div className="flex justify-between mt-1"><span className="text-white/45">Discount code</span><b className="text-[#F2762E]">{done.discount_code}</b></div>
            </div>
            <p className="text-white/40 text-xs mt-3">Screenshot this — show your discount code when you buy any eligible Shoe Cleaner product.</p>
          </div>
        </section>
      )}

      {/* VIDEO */}
      <section className="px-5 py-8 max-w-md mx-auto">
        <h2 className="font-black uppercase text-[#F2762E] text-lg tracking-wide mb-3">See it in action</h2>
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
          <video ref={vidRef} src={c.video_url || "/shoe-cleaner/demo.mp4"} poster={c.video_poster || "/shoe-cleaner/demo-poster.jpg"}
            className="w-full max-h-[70vh] object-contain bg-black" playsInline controls={playing}
            onPlay={() => setPlaying(true)} onEnded={() => setPlaying(false)} preload="none" />
          {!playing && (
            <button aria-label="Play video" onClick={() => { vidRef.current?.play(); }}
              className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="w-16 h-16 rounded-full bg-[#F2762E] flex items-center justify-center shadow-xl">
                <span className="ml-1 border-y-[11px] border-y-transparent border-l-[18px] border-l-black" />
              </span>
            </button>
          )}
        </div>
      </section>

      {/* KIT */}
      <section className="px-5 py-8 max-w-md mx-auto">
        <h2 className="font-black uppercase text-[#F2762E] text-lg tracking-wide mb-3">What's in the kit</h2>
        <img src={c.features_img || "/shoe-cleaner/kit-contents.jpg"} alt="Kit contents" className="rounded-xl border border-white/10" />
        <ul className="grid grid-cols-1 gap-2 mt-4">
          {features.map(ft => (
            <li key={ft} className="flex items-center gap-3 bg-white/[.04] border border-white/[.08] rounded-lg px-4 py-2.5 text-sm text-white/75">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2762E] flex-none" />{ft}
            </li>
          ))}
        </ul>
      </section>

      {/* BEFORE / AFTER */}
      <section className="px-5 py-8 max-w-md mx-auto">
        <h2 className="font-black uppercase text-[#F2762E] text-lg tracking-wide mb-3">Before &amp; after</h2>
        <img src={c.before_after_img || "/shoe-cleaner/before-after.jpg"} alt="Before and after cleaning" className="rounded-xl border border-white/10" />
      </section>

      {/* OFFER */}
      <section className="px-5 py-8 max-w-md mx-auto">
        <h2 className="font-black uppercase text-[#F2762E] text-lg tracking-wide mb-3">Two ways you win</h2>
        <div className="space-y-3">
          <div className="border border-[#F2762E]/40 bg-[#F2762E]/[.07] rounded-xl p-4">
            <div className="font-black uppercase tracking-wide text-[#F2762E]">1 · Register &amp; win</div>
            <p className="text-white/60 text-sm mt-1">One Shoe Essential Kit winner drawn every month until December 31, 2027.</p>
          </div>
          <div className="border border-[#F2762E]/40 bg-[#F2762E]/[.07] rounded-xl p-4">
            <div className="font-black uppercase tracking-wide text-[#F2762E]">2 · Enjoy {pct}% off</div>
            <p className="text-white/60 text-sm mt-1">Every registered player gets {pct}% off eligible Shoe Cleaner products — the discount is yours whether or not you win.</p>
          </div>
        </div>
        {!!cfg?.winners?.length && (
          <div className="mt-4 text-xs text-white/45">
            <b className="text-white/70 uppercase tracking-wider">Past winners:</b>{" "}
            {cfg.winners.map(w => `${w.name} (${w.period})`).join(" · ")}
          </div>
        )}
      </section>

      {/* REGISTRATION */}
      <section ref={formRef} className="px-5 py-8 max-w-md mx-auto">
        <h2 className="font-black uppercase text-[#F2762E] text-lg tracking-wide">Register your voucher</h2>
        {done ? (
          <p className="text-white/55 text-sm mt-3">You're registered — reference <b className="text-white">{done.ref}</b>. One voucher, one registration. 🎉</p>
        ) : (
          <form onSubmit={submit} className="mt-1">
            <label className={lbl} htmlFor="pw-name">Full name</label>
            <input id="pw-name" className={inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Juan R. Dela Cruz" required maxLength={120} />
            <label className={lbl} htmlFor="pw-email">Email</label>
            <input id="pw-email" type="email" className={inp} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="you@email.com" required />
            <label className={lbl} htmlFor="pw-phone">Contact number</label>
            <input id="pw-phone" className={inp} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="09xx xxx xxxx" required maxLength={32} inputMode="tel" />
            <label className={lbl} htmlFor="pw-prof">Profession <span className="normal-case tracking-normal text-white/30">(optional)</span></label>
            <input id="pw-prof" className={inp} value={f.profession} onChange={e => setF({ ...f, profession: e.target.value })} placeholder="e.g. Coach, Nurse, Engineer" maxLength={80} />
            <label className={lbl} htmlFor="pw-code">Voucher number</label>
            <input id="pw-code" className={inp + " uppercase tracking-widest"} value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="SBPB-000000" required maxLength={16} />

            <label className="flex items-start gap-3 mt-5 text-xs text-white/55 leading-relaxed">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#F2762E] flex-none" checked={f.privacy}
                onChange={e => setF({ ...f, privacy: e.target.checked })} id="pw-privacy" />
              <span><b className="text-white/80">I agree to the <Link href="/privacy-policy"><a className="underline text-[#F2762E]">Privacy Notice</a></Link></b> and consent to SoleBlessing processing my information for this promo (required, Data Privacy Act of 2012).</span>
            </label>
            <label className="flex items-start gap-3 mt-3 text-xs text-white/55 leading-relaxed">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#F2762E] flex-none" checked={f.marketing}
                onChange={e => setF({ ...f, marketing: e.target.checked })} id="pw-marketing" />
              <span>Send me SoleBlessing promos and new drops (optional).</span>
            </label>

            {err && <p className="text-red-400 text-sm mt-4">{err}</p>}
            <button type="submit" disabled={busy}
              className="mt-5 w-full bg-[#F2762E] text-black font-black uppercase tracking-[.14em] py-3.5 rounded hover:opacity-90 disabled:opacity-40">
              {busy ? "Checking voucher…" : "Submit registration"}
            </button>
          </form>
        )}
      </section>

      <footer className="px-5 pt-4 pb-10 max-w-md mx-auto text-[10px] text-white/30 leading-relaxed border-t border-white/[.07]">
        {c.terms || "Promo terms apply."} {" "}
        <Link href="/"><a className="underline">soleblessingofficial.com</a></Link>
      </footer>
    </div>
  );
}
