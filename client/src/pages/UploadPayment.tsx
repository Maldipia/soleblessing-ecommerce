import { useState, useRef, useEffect } from "react";
import { usePaymentMethods, digitsOnly } from "@/hooks/usePaymentMethods";

// SoleBlessing Payment Portal — all-white redesign (approved mockup, Nov 25).
// Same engine as before, new skin: methods still come from
// sb_settings.payment_methods (NEVER hardcoded), copy-to-clipboard with
// "Copied!" state, auto QR display per method with lightbox + download,
// uploads still go through /api/upload-proof (private storage, 5MB).
// Submitting NEVER marks an order paid — verification stays with the admin.

// Maps a payment-method id from sb_settings → its static QR image in /public.
// Add an entry here only when the matching QR file actually exists.
const QR_IMAGES: Record<string, string> = {
  gcash_pia: "/qr-gcash.png",
  unionbank: "/qr-unionbank.png", // InstaPay — Pia's cropped official QR
};

const tileEmoji = (m: { type?: string; label: string }) =>
  m.type === "ewallet" ? "📱" : "🏦";

export default function UploadPayment() {
  const { methods: payMethods, loading: payLoading } = usePaymentMethods();
  const [selId, setSelId] = useState("");          // selected method entry id ("other" = message us)
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [refId, setRefId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");        // amount due (prefilled from link)
  const [paidAmount, setPaidAmount] = useState(""); // amount paid this submission
  const [payDate, setPayDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }));
  const [refNo, setRefNo] = useState("");
  const [msg, setMsg] = useState("");
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function copyText(text: string, btn: HTMLButtonElement) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent ?? "Copy";
      btn.textContent = "✓ Copied!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1800);
    });
  }

  // Prefill from the invoice/email link: ?order=SB-xxx&name=...&amount=...
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const o = sp.get("order") || sp.get("orderId") || "";
      if (o) setOrderId(o.toUpperCase());
      if (sp.get("name")) setCustomerName(sp.get("name") as string);
      if (sp.get("amount")) { setAmount(sp.get("amount") as string); setPaidAmount(sp.get("amount") as string); }
    } catch {}
  }, []);

  // Default selection = first configured method from the Dashboard settings.
  useEffect(() => {
    if (!payLoading && !selId && payMethods.length > 0) setSelId(payMethods[0].id);
  }, [payLoading, payMethods, selId]);

  const sel = payMethods.find(m => m.id === selId) || null;
  const selQr = sel && QR_IMAGES[sel.id] ? QR_IMAGES[sel.id] : null;

  function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024) { setUploadError("File is too large — maximum is 5 MB."); return; }
    setUploadError("");
    setFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = e => setPreview(e.target?.result as string);
      r.readAsDataURL(f);
    } else setPreview(null);
  }

  async function handleSubmit() {
    if (!orderId || !customerName || !paidAmount || !refNo || !file) {
      const missing = [
        !orderId && "Order Number", !customerName && "Customer Name", !paidAmount && "Amount Paid",
        !refNo && "Reference No.", !file && "payment screenshot",
      ].filter(Boolean).join(", ");
      setUploadError(`Please fill in: ${missing}`);
      const panel = document.getElementById("sb-pay-card");
      if (panel) { panel.style.animation = "none"; void panel.offsetHeight; panel.style.animation = "sbShake 0.4s ease"; }
      return;
    }
    setSubmitting(true); setUploadError(""); setProgress(0);
    const tick = setInterval(() => setProgress(p => { if (p >= 90) { clearInterval(tick); return 90; } return p + Math.random() * 15; }), 200);
    try {
      const base64Data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = e => res((e.target?.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      // Payment date rides the message so the existing API stays untouched.
      const message = [`Paid on ${payDate}`, msg.trim()].filter(Boolean).join(" · ");
      const body = JSON.stringify({ orderId, customerName, amount: paidAmount, paymentMethod: sel ? `${sel.label} (${sel.account_name})` : "Other", referenceNumber: refNo, message, fileBase64: base64Data, mimeType: file.type, fileName: file.name });
      const r = await fetch("/api/upload-proof", { method: "POST", body, headers: { "Content-Type": "application/json" } });
      if (!r.ok) {
        const out = await r.json().catch(() => ({} as any));
        clearInterval(tick); setSubmitting(false); setProgress(0);
        setUploadError(out.error || "Upload failed — try again");
        return;
      }
    } catch {
      clearInterval(tick); setSubmitting(false); setProgress(0);
      setUploadError("Network error — try again");
      return;
    }
    clearInterval(tick);
    setProgress(100);
    setTimeout(() => { setRefId("SB-" + Date.now().toString(36).toUpperCase()); setSuccess(true); }, 400);
  }

  function resetForm() {
    setSuccess(false); setSubmitting(false); setProgress(0);
    setOrderId(""); setCustomerName(""); setPaidAmount(""); setRefNo(""); setMsg("");
    setFile(null); setPreview(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        .pp{font-family:'DM Sans',sans-serif;background:#f4f3f0;min-height:100vh;color:#111;padding-bottom:60px}
        .pp-hero{background:#ffffff;border-bottom:1px solid #eceae6;padding:30px 20px 24px;text-align:center}
        .pp-logo{display:inline-block;width:76px;height:76px;border-radius:50%;object-fit:contain;background:#000;border:3px solid #f0ede8;margin:0 auto 10px}
        .pp-hero h1{font-size:30px;font-weight:900;color:#111}
        .pp-hero h1 em{color:#EA580C;font-style:normal}
        .pp-hero p{color:#8b867f;font-size:13.5px;margin-top:5px}
        .pp-steps{display:flex;justify-content:center;gap:8px;margin-top:18px;flex-wrap:wrap}
        .pp-step{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#6b665f;background:#faf9f7;border:1px solid #eceae6;border-radius:999px;padding:7px 14px}
        .pp-sn{width:22px;height:22px;border-radius:50%;background:#EA580C;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px}
        .pp-card{max-width:880px;margin:22px auto 0;background:#fff;border:1px solid #eceae6;border-radius:22px;padding:24px 26px;box-shadow:0 6px 24px rgba(0,0,0,.05)}
        @media(max-width:700px){.pp-card{margin:14px 12px 0;padding:18px 16px;border-radius:16px}}
        .pp-strip{display:flex;gap:12px;background:#faf9f7;border:1px solid #efedea;border-radius:14px;padding:12px 16px;align-items:center;flex-wrap:wrap}
        .pp-si{flex:1;min-width:150px}
        .pp-si label{font-size:10.5px;color:#9b968f;font-weight:800;letter-spacing:.05em}
        .pp-si input{display:block;width:100%;border:none;background:transparent;font-size:16px;font-weight:900;color:#111;outline:none;padding:2px 0}
        .pp-si input::placeholder{color:#c9c4bd;font-weight:600}
        .pp-due{background:#FFF3E8;border:1px solid #F8C89B;border-radius:12px;padding:8px 16px;text-align:right;min-width:150px}
        .pp-due label{font-size:10.5px;color:#b45309;font-weight:800}
        .pp-due b{display:block;color:#EA580C;font-size:21px;font-weight:900}
        .pp-h2{font-size:16.5px;font-weight:900;color:#111;margin:24px 0 12px;display:flex;align-items:center;gap:10px}
        .pp-n{width:25px;height:25px;border-radius:50%;background:#EA580C;color:#fff;font-size:12.5px;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0}
        .pp-req{color:#EA580C}
        .pp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
        .pp-tile{border:2px solid #eceae6;border-radius:14px;padding:13px 8px;text-align:center;font-weight:800;font-size:13px;color:#333;background:#fff;cursor:pointer;transition:all .15s}
        .pp-tile:hover{border-color:#f3b183}
        .pp-tile.on{border-color:#EA580C;background:#FFF7F1}
        .pp-tile small{display:block;font-weight:600;color:#9b968f;font-size:10.5px;margin-top:3px}
        .pp-pay{display:flex;gap:22px;border:1px solid #efedea;border-radius:16px;padding:18px 20px;margin-top:14px;flex-wrap:wrap}
        .pp-pl{flex:1.4;min-width:250px}
        .pp-pl h3{font-size:18px;font-weight:900;color:#111}
        .pp-pl .d{color:#8b867f;font-size:12.5px;margin:3px 0 12px}
        .pp-acct{background:#faf9f7;border-radius:12px;padding:13px 16px}
        .pp-acct p{font-size:10px;font-weight:800;color:#9b968f;letter-spacing:.07em;margin-top:9px}
        .pp-acct p:first-child{margin-top:0}
        .pp-acct b{font-size:14.5px;color:#111}
        .pp-num{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .pp-num b{font-size:18px;letter-spacing:.05em;font-family:ui-monospace,SFMono-Regular,monospace}
        .pp-cp{border:1.5px solid #EA580C;color:#EA580C;background:#fff;font-size:11px;font-weight:900;border-radius:9px;padding:6px 12px;cursor:pointer;transition:all .15s}
        .pp-cp:hover{background:#FFF3E8}
        .pp-cp.copied{background:#E8F5EE;border-color:#5db87a;color:#1a7f4e}
        .pp-qr{flex:1;min-width:190px;border-left:1px dashed #e4e1dc;padding-left:22px;text-align:center}
        @media(max-width:700px){.pp-qr{border-left:none;padding-left:0;border-top:1px dashed #e4e1dc;padding-top:16px}}
        .pp-qr p{font-size:12px;font-weight:800;color:#555;margin-bottom:10px}
        .pp-qrbox{width:164px;height:164px;border:2px solid #EA580C;border-radius:12px;margin:0 auto;background:#fff;display:flex;align-items:center;justify-content:center;cursor:zoom-in;padding:6px}
        .pp-qrbox img{width:100%;height:100%;object-fit:contain}
        .pp-dl{display:inline-block;margin-top:10px;border:1.5px solid #EA580C;color:#EA580C;border-radius:999px;font-size:11.5px;font-weight:900;padding:7px 16px;text-decoration:none;cursor:pointer}
        .pp-dl:hover{background:#FFF3E8}
        .pp-grid{display:flex;gap:12px;flex-wrap:wrap}
        .pp-f{flex:1;min-width:170px}
        .pp-f label{font-size:11.5px;font-weight:800;color:#555}
        .pp-f input,.pp-f textarea{width:100%;border:1.5px solid #e7e4e0;border-radius:11px;padding:11px 13px;font-size:14px;color:#111;margin-top:5px;background:#fff;outline:none;font-family:inherit;transition:border-color .15s,box-shadow .15s}
        .pp-f input:focus,.pp-f textarea:focus{border-color:#EA580C;box-shadow:0 0 0 3px rgba(234,88,12,.1)}
        .pp-up{display:flex;gap:14px;flex-wrap:wrap}
        .pp-drop{flex:1.6;min-width:250px;border:2px dashed rgba(234,88,12,.55);border-radius:16px;padding:26px 16px;text-align:center;background:#FFFCF9;cursor:pointer;transition:border-color .2s}
        .pp-drop:hover{border-color:#EA580C}
        .pp-drop b{color:#111;font-size:14.5px;display:block;margin-top:6px}
        .pp-browse{display:inline-block;margin-top:10px;border:1.5px solid #EA580C;color:#EA580C;border-radius:11px;font-weight:900;font-size:13px;padding:9px 18px}
        .pp-drop small{display:block;color:#9b968f;margin-top:10px;font-weight:600}
        .pp-preview{flex:1.6;min-width:250px;border:1px solid #eceae6;border-radius:16px;overflow:hidden;background:#faf9f7}
        .pp-preview img{width:100%;max-height:170px;object-fit:cover;display:block}
        .pp-preview-info{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:700}
        .pp-x{background:none;border:none;color:#c04;cursor:pointer;font-size:15px}
        .pp-priv{display:flex;gap:10px;background:#faf9f7;border:1px solid #efedea;border-radius:12px;padding:12px 16px;font-size:12px;color:#6b665f;margin-top:16px;line-height:1.55}
        .pp-progress{height:4px;background:#f0ede8;border-radius:2px;margin-top:14px;overflow:hidden}
        .pp-progress i{display:block;height:100%;background:linear-gradient(90deg,#EA580C,#fb923c);transition:width .3s ease}
        .pp-err{color:#c2410c;font-size:12.5px;font-weight:700;margin-top:10px}
        .pp-sbm{display:block;width:100%;background:#EA580C;color:#fff;text-align:center;border:none;border-radius:14px;font-size:16.5px;font-weight:900;padding:16px;margin-top:14px;cursor:pointer;font-family:inherit;transition:opacity .15s}
        .pp-sbm:hover:not(:disabled){opacity:.92}
        .pp-sbm:disabled{opacity:.55;cursor:not-allowed}
        .pp-foot{text-align:center;font-size:12px;color:#9b968f;margin-top:10px;font-weight:600}
        .pp-brandfoot{text-align:center;font-size:11.5px;color:#9b968f;margin-top:26px;font-weight:600}
        .pp-brandfoot b{color:#EA580C}
        @keyframes sbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
        .pp-overlay{position:fixed;inset:0;background:rgba(17,17,17,.55);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:16px}
        .pp-success{background:#fff;border-radius:20px;padding:34px 28px;text-align:center;max-width:380px;width:100%}
        .pp-check{width:62px;height:62px;background:#E8F5EE;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:28px;color:#1a7f4e}
        .pp-success h2{font-size:21px;font-weight:900;color:#111;margin-bottom:6px}
        .pp-success .m{font-size:13px;color:#6b665f;line-height:1.6}
        .pp-kv{background:#faf9f7;border:1px solid #efedea;border-radius:12px;padding:12px 16px;margin:14px 0;text-align:left;font-size:13px}
        .pp-kv div{display:flex;justify-content:space-between;gap:12px;padding:3px 0}
        .pp-kv span{color:#9b968f}.pp-kv b{font-weight:800;color:#111}
        .pp-acts{display:flex;gap:8px;margin:4px 0 12px}
        .pp-acts a{flex:1;text-align:center;padding:11px 0;border-radius:11px;font-weight:800;font-size:12.5px;text-decoration:none}
        .pp-ref{font-size:11px;color:#9b968f}
        .pp-ref b{display:block;font-size:14px;color:#EA580C;letter-spacing:.08em;margin-top:2px}
        .pp-again{margin-top:12px;background:#111;color:#fff;border:none;border-radius:11px;padding:11px 26px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit}
        .pp-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px}
        .pp-lb{background:#fff;border-radius:18px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:10px;max-width:92vw}
        .pp-lb-head{width:100%;display:flex;justify-content:space-between;align-items:center;font-weight:900;color:#111}
        .pp-lb img{width:min(72vw,380px);height:min(72vw,380px);object-fit:contain}
        .pp-lb-x{background:#f0ede8;border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-weight:900}
      `}</style>

      <div className="pp">
        {/* hero */}
        <div className="pp-hero">
          <img className="pp-logo" src="/sb-logo.jpg" alt="SoleBlessing" />
          <h1>Upload <em>Payment Proof</em></h1>
          <p>Submit your payment confirmation for verification.</p>
          <div className="pp-steps">
            <span className="pp-step"><span className="pp-sn">1</span>Choose Payment Method</span>
            <span className="pp-step"><span className="pp-sn">2</span>Payment Details</span>
            <span className="pp-step"><span className="pp-sn">3</span>Upload &amp; Submit</span>
          </div>
        </div>

        <div className="pp-card" id="sb-pay-card">
          {/* order summary strip */}
          <div className="pp-strip">
            <div className="pp-si"><label>🛒 ORDER NUMBER</label>
              <input value={orderId} onChange={e => setOrderId(e.target.value.toUpperCase())} placeholder="SB-…" /></div>
            <div className="pp-si"><label>👤 CUSTOMER NAME</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" /></div>
            {amount && <div className="pp-due"><label>AMOUNT DUE</label><b>₱{Number(amount).toLocaleString("en-PH")}</b></div>}
          </div>

          {/* 1 — payment method */}
          <h2 className="pp-h2"><span className="pp-n">1</span>Select Payment Method <span className="pp-req">*</span></h2>
          {payLoading && <p style={{ color: "#9b968f", fontSize: 13, fontWeight: 600 }}>Loading payment methods…</p>}
          <div className="pp-tiles">
            {payMethods.map(m => (
              <div key={m.id} className={`pp-tile${selId === m.id ? " on" : ""}`} onClick={() => setSelId(m.id)}>
                {tileEmoji(m)} {m.label}<small>{m.account_name}</small>
              </div>
            ))}
            {!payLoading && <div className={`pp-tile${selId === "other" ? " on" : ""}`} onClick={() => setSelId("other")}>•••<small>Other — message us</small></div>}
          </div>

          {sel && (
            <div className="pp-pay">
              <div className="pp-pl">
                <h3>{tileEmoji(sel)} {sel.label}</h3>
                <p className="d">Send your payment to our {sel.label} account:</p>
                <div className="pp-acct">
                  <p>ACCOUNT NAME</p><b>{sel.account_name}</b>
                  <p>ACCOUNT NUMBER</p>
                  <div className="pp-num">
                    <b>{sel.account_number}</b>
                    <button className="pp-cp" onClick={e => copyText(digitsOnly(sel.account_number), e.currentTarget)}>⧉ Copy</button>
                  </div>
                </div>
              </div>
              {selQr && (
                <div className="pp-qr">
                  <p>Or Scan the QR Code</p>
                  <div className="pp-qrbox" onClick={() => setLightbox({ src: selQr, label: sel.label })} title="Tap to enlarge">
                    <img src={selQr} alt={`${sel.label} QR code`} />
                  </div>
                  <div>
                    <a className="pp-dl" href={selQr} download={`soleblessing-${sel.id}-qr.png`}>⤓ Download QR</a>
                  </div>
                </div>
              )}
            </div>
          )}
          {selId === "other" && (
            <div className="pp-pay"><div className="pp-pl">
              <h3>••• Other payment method</h3>
              <p className="d">Message us on Facebook and we'll arrange it with you directly:</p>
              <a className="pp-dl" href="https://m.me/SoleBlessingOfficial" target="_blank" rel="noopener noreferrer">💬 m.me/SoleBlessingOfficial</a>
            </div></div>
          )}

          {/* 2 — payment details */}
          <h2 className="pp-h2"><span className="pp-n">2</span>Payment Details <span className="pp-req">*</span></h2>
          <div className="pp-grid">
            <div className="pp-f"><label>Payment Date *</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
            <div className="pp-f"><label>Amount Paid (₱) *</label>
              <input type="number" inputMode="decimal" placeholder="0.00" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} /></div>
            <div className="pp-f" style={{ flex: 2 }}><label>Transaction / Reference Number *</label>
              <input placeholder="e.g. GCash Ref No., bank reference" value={refNo} onChange={e => setRefNo(e.target.value)} /></div>
          </div>

          {/* 3 — upload */}
          <h2 className="pp-h2"><span className="pp-n">3</span>Upload Payment Proof <span className="pp-req">*</span></h2>
          <div className="pp-up">
            {!file ? (
              <div className="pp-drop" onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "#EA580C"; }}
                onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ""; }}
                onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = ""; const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
                <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <span style={{ fontSize: 30 }}>☁️</span>
                <b>Drag and drop your file here</b>
                <span style={{ color: "#9b968f", fontSize: 12, fontWeight: 600 }}>or</span><br />
                <span className="pp-browse">🖼 Browse Files</span>
                <small>Accepted: JPG, PNG, WEBP, PDF &nbsp;|&nbsp; Max size: 5 MB</small>
              </div>
            ) : (
              <div className="pp-preview">
                {preview && <img src={preview} alt="Payment proof preview" />}
                <div className="pp-preview-info">
                  <span>{file.name}</span>
                  <button className="pp-x" onClick={() => { setFile(null); setPreview(null); }}>✕</button>
                </div>
              </div>
            )}
            <div className="pp-f"><label>Notes (Optional)</label>
              <textarea rows={5} maxLength={500} placeholder="Add a note for our team (e.g. layaway installment 2 of 4, sender name is different)"
                value={msg} onChange={e => setMsg(e.target.value)} /></div>
          </div>

          <div className="pp-priv">🔒<span><b>Privacy &amp; Security</b> — your uploaded payment proof is private and visible only to authorized SoleBlessing staff.</span></div>

          {submitting && <div className="pp-progress"><i style={{ width: `${progress}%` }} /></div>}
          {uploadError && <p className="pp-err">{uploadError}</p>}
          <button className="pp-sbm" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "✈ Submit Payment Proof"}
          </button>
          <p className="pp-foot">Your submission will be reviewed by our team. Your order is not marked paid until payment is verified.</p>
        </div>

        <p className="pp-brandfoot"><b>SOLEBLESSING</b> · soleblessingofficial.com · Amadeo, Cavite 🇵🇭</p>
      </div>

      {/* success — awaiting verification, never "paid" */}
      {success && (
        <div className="pp-overlay">
          <div className="pp-success">
            <div className="pp-check">✓</div>
            <h2>Payment proof submitted!</h2>
            <p className="m">Your payment is <b>awaiting verification</b> by SoleBlessing. We'll confirm it and update your order shortly — no need to resend.</p>
            <div className="pp-kv">
              {[["Order Number", orderId], ["Amount Paid", paidAmount ? `₱${Number(paidAmount).toLocaleString("en-PH")}` : ""],
                ["Payment Method", sel ? sel.label : "Other"], ["Date Paid", payDate]].map(([k, v]) => v ? (
                <div key={k as string}><span>{k}</span><b>{v}</b></div>
              ) : null)}
            </div>
            <div className="pp-acts">
              <a href={`/invoice/${encodeURIComponent(orderId)}`} style={{ border: "1.5px solid #EA580C", color: "#EA580C" }}>View Invoice</a>
              <a href={`/order/${encodeURIComponent(orderId)}`} style={{ background: "#EA580C", color: "#fff" }}>Track My Order</a>
            </div>
            <p className="pp-ref">Submission Reference<b>{refId}</b></p>
            <button className="pp-again" onClick={resetForm}>Submit Another</button>
          </div>
        </div>
      )}

      {/* QR lightbox */}
      {lightbox && (
        <div className="pp-lightbox" onClick={() => setLightbox(null)}>
          <div className="pp-lb" onClick={e => e.stopPropagation()}>
            <div className="pp-lb-head"><span>{lightbox.label} — Scan to Pay</span>
              <button className="pp-lb-x" onClick={() => setLightbox(null)}>✕</button></div>
            <img src={lightbox.src} alt={`${lightbox.label} QR`} />
            <a className="pp-dl" href={lightbox.src} download>⤓ Download QR</a>
          </div>
        </div>
      )}
    </>
  );
}
