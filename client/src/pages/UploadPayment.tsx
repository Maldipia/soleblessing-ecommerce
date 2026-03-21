import { useState, useRef } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwha-_yAysVRVspY0z1XYcD3lz1ow1Z4704M-Eu0Moq4hXjeL6uB4bLiVEr3Fyw5uKPcg/exec";

export default function UploadPayment() {
  const [activeTab, setActiveTab] = useState<"bank"|"ewallet"|"qr">("bank");
  const [method, setMethod] = useState("GCash");
  const [file, setFile]     = useState<File|null>(null);
  const [preview, setPreview] = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [success, setSuccess]       = useState(false);
  const [refId, setRefId]           = useState("");
  const [orderId, setOrderId]       = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount]         = useState("");
  const [refNo, setRefNo]           = useState("");
  const [lightbox, setLightbox]     = useState<{src:string;label:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function copyText(text: string, btn: HTMLButtonElement) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent ?? "Copy";
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1800);
    });
  }

  function handleFile(f: File) {
    setFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = e => setPreview(e.target?.result as string);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit() {
    if (!orderId || !customerName || !amount || !refNo || !file) {
      const panel = document.getElementById("sb-upload-panel");
      if (panel) { panel.style.animation = "none"; void panel.offsetHeight; panel.style.animation = "sbShake 0.4s ease"; }
      return;
    }
    setSubmitting(true);
    setProgress(0);
    const tick = setInterval(() => setProgress(p => { if (p >= 90) { clearInterval(tick); return 90; } return p + Math.random() * 15; }), 200);
    try {
      const base64Data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = e => res((e.target?.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const body = JSON.stringify({ orderId, customerName, amount, paymentMethod: method, referenceNumber: refNo, fileBase64: base64Data, mimeType: file.type, fileName: file.name });
      await fetch(APPS_SCRIPT_URL, { method: "POST", body, headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow" });
    } catch (_) { /* GAS redirect is expected */ }
    clearInterval(tick);
    setProgress(100);
    setTimeout(() => { setRefId("SB-" + Date.now().toString(36).toUpperCase()); setSuccess(true); }, 400);
  }

  function resetForm() {
    setSuccess(false); setSubmitting(false); setProgress(0);
    setOrderId(""); setCustomerName(""); setAmount(""); setRefNo("");
    setFile(null); setPreview(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        .sb-wrap{font-family:'DM Sans',sans-serif;background:#0b1a1f;color:#e8ede9;min-height:100vh;padding:48px 24px 80px;position:relative;}
        .sb-wrap::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 70% 40% at 85% 5%,rgba(201,168,76,.05) 0%,transparent 55%),radial-gradient(ellipse 50% 60% at 5% 90%,rgba(201,168,76,.03) 0%,transparent 50%);pointer-events:none;z-index:0;}
        .sb-inner{position:relative;z-index:1;max-width:860px;margin:0 auto;}
        .sb-header{text-align:center;margin-bottom:44px;animation:sbFadeUp .7s ease both;}
        .sb-brand-logos{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-bottom:28px;}
        .sb-brand-logo{width:68px;height:68px;border-radius:50%;background:#0e2228;border:1.5px solid #1e3840;display:flex;align-items:center;justify-content:center;overflow:hidden;transition:border-color .25s,transform .2s,box-shadow .2s;cursor:default;}
        .sb-brand-logo:hover{border-color:rgba(201,168,76,.4);transform:translateY(-2px);box-shadow:0 6px 20px rgba(201,168,76,.15);}
        .sb-brand-logo img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
        .sb-eyebrow{font-family:'Cormorant Garamond',serif;font-size:12px;letter-spacing:.4em;text-transform:uppercase;color:#c9a84c;margin-bottom:6px;}
        .sb-title{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:600;line-height:1;margin-bottom:10px;}
        .sb-sub{font-size:13px;color:#7a9e85;}
        .sb-divider{width:52px;height:1px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:18px auto;}
        .sb-layout{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;}
        @media(max-width:680px){.sb-layout{grid-template-columns:1fr;}.sb-field-row{grid-template-columns:1fr!important;}.sb-method-grid{grid-template-columns:repeat(2,1fr)!important;}.sb-title{font-size:32px;}}
        .sb-panel{background:#0e2228;border:1px solid #1e3840;border-radius:14px;overflow:hidden;animation:sbFadeUp .7s .1s ease both;}
        .sb-panel-header{padding:18px 24px 14px;border-bottom:1px solid #1e3840;display:flex;align-items:center;gap:10px;}
        .sb-panel-icon{width:32px;height:32px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;}
        .sb-panel-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;}
        .sb-panel-sub{font-size:11px;color:#4a7055;letter-spacing:.06em;margin-top:1px;}
        .sb-panel-body{padding:20px 24px 24px;}
        .sb-tab-nav{display:flex;background:#0b1a1f;border:1px solid #1e3840;border-radius:50px;padding:4px;margin-bottom:20px;}
        .sb-tab-btn{flex:1;padding:9px 0;border:none;background:transparent;color:#4a7055;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;border-radius:50px;cursor:pointer;transition:all .22s;}
        .sb-tab-btn.active{background:#c9a84c;color:#0b1a1f;font-weight:600;}
        .sb-tab-section{display:none;}
        .sb-tab-section.active{display:block;}
        .sb-pay-card{display:flex;align-items:center;gap:12px;background:#112830;border:1px solid #1e3840;border-radius:10px;padding:13px 15px;margin-bottom:8px;position:relative;overflow:hidden;transition:border-color .2s;}
        .sb-pay-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#c9a84c;opacity:0;transition:opacity .2s;}
        .sb-pay-card:hover{border-color:#2d5a60;}
        .sb-pay-card:hover::before{opacity:1;}
        .sb-bank-badge{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;font-family:'DM Sans',sans-serif;}
        .sb-badge-bdo{background:#012169;color:#fff;font-size:13px;}
        .sb-badge-bpi{background:#c8102e;color:#fff;font-size:14px;}
        .sb-badge-ub{background:#e87722;color:#fff;font-size:10px;line-height:1.2;text-align:center;}
        .sb-badge-gcash{background:#007dff;color:#fff;font-size:10px;line-height:1.3;text-align:center;}
        .sb-pay-info{flex:1;min-width:0;}
        .sb-pay-bank{font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#4a7055;margin-bottom:1px;}
        .sb-pay-holder{font-size:13px;font-weight:500;margin-bottom:1px;}
        .sb-pay-number{font-family:'Courier New',monospace;font-size:12px;color:#c9a84c;letter-spacing:.08em;}
        .sb-copy-btn{background:#152e35;border:1px solid #1e3840;color:#7a9e85;font-size:10px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;padding:7px 12px;border-radius:7px;cursor:pointer;flex-shrink:0;transition:all .2s;}
        .sb-copy-btn:hover{color:#c9a84c;border-color:rgba(201,168,76,.25);}
        .sb-copy-btn.copied{background:rgba(93,184,122,.1);color:#5db87a;border-color:rgba(93,184,122,.3);}
        .sb-qr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
        .sb-qr-card{background:#112830;border:1px solid #1e3840;border-radius:10px;padding:16px 12px;text-align:center;}
        .sb-qr-label{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;}
        .sb-qr-ph{width:100%;aspect-ratio:1;border:1.5px dashed #1e3840;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#0b1a1f;color:#1e3840;font-size:10px;text-align:center;line-height:1.5;margin-bottom:8px;padding:8px;}
        .sb-qr-ph img{width:100%;height:100%;object-fit:contain;border-radius:6px;}
        .sb-qr-name{font-size:11px;font-weight:500;}
        .sb-qr-acct{font-size:10px;color:#4a7055;margin-top:1px;}
        .sb-instapay{display:inline-block;margin-top:6px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;background:rgba(77,144,214,.1);color:#4d90d6;border:1px solid rgba(77,144,214,.2);padding:3px 8px;border-radius:50px;}
        .sb-upload-panel{animation:sbFadeUp .7s .2s ease both;}
        .sb-field{margin-bottom:14px;}
        .sb-field label{display:block;font-size:10px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#4a7055;margin-bottom:7px;}
        .sb-field input{width:100%;background:#112830;border:1px solid #1e3840;border-radius:10px;padding:12px 14px;color:#e8ede9;font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s;}
        .sb-field input:focus{border-color:#c9a84c;box-shadow:0 0 0 3px rgba(201,168,76,.12);}
        .sb-field input::placeholder{color:rgba(122,158,133,.4);}
        .sb-field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .sb-method-label{font-size:10px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#4a7055;margin-bottom:8px;display:block;}
        .sb-method-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;}
        .sb-method-btn{background:#112830;border:1px solid #1e3840;border-radius:10px;padding:10px 6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;color:#4a7055;font-family:'DM Sans',sans-serif;font-size:9.5px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;transition:all .2s;}
        .sb-method-btn:hover{border-color:rgba(201,168,76,.25);color:#7a9e85;}
        .sb-method-btn.active{background:rgba(201,168,76,.12);border-color:#c9a84c;color:#c9a84c;}
        .sb-method-emoji{font-size:18px;line-height:1;}
        .sb-upload-zone{border:1.5px dashed #1e3840;border-radius:10px;padding:28px 16px;text-align:center;cursor:pointer;position:relative;overflow:hidden;background:#112830;margin-bottom:12px;transition:border-color .25s;}
        .sb-upload-zone:hover{border-color:#c9a84c;border-style:solid;}
        .sb-upload-icon{font-size:28px;margin-bottom:8px;display:block;transition:transform .2s;}
        .sb-upload-zone:hover .sb-upload-icon{transform:translateY(-2px);}
        .sb-upload-main{font-size:13px;font-weight:500;}
        .sb-upload-sub{font-size:11px;color:#7a9e85;margin-top:3px;}
        .sb-format-tags{display:flex;gap:5px;justify-content:center;margin-top:10px;}
        .sb-format-tag{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.2);padding:3px 7px;border-radius:4px;}
        .sb-preview{border-radius:10px;overflow:hidden;background:#152e35;border:1px solid #1e3840;margin-bottom:12px;}
        .sb-preview img{width:100%;max-height:160px;object-fit:cover;display:block;}
        .sb-preview-info{padding:9px 13px;display:flex;align-items:center;justify-content:space-between;}
        .sb-preview-name{font-size:12px;font-weight:500;}
        .sb-remove-btn{background:none;border:none;color:#7a9e85;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;transition:color .2s;}
        .sb-remove-btn:hover{color:#e05;}
        .sb-progress{height:2px;background:#152e35;border-radius:1px;margin-bottom:12px;overflow:hidden;}
        .sb-progress-fill{height:100%;background:linear-gradient(90deg,#c9a84c,#e8c87a);transition:width .3s ease;}
        .sb-submit{width:100%;background:#c9a84c;color:#0b1a1f;border:none;border-radius:10px;padding:15px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;cursor:pointer;transition:transform .15s,box-shadow .2s;}
        .sb-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px rgba(201,168,76,.28);}
        .sb-submit:disabled{opacity:.5;cursor:not-allowed;}
        .sb-notice{background:#0e2228;border:1px solid #1e3840;border-left:3px solid #c9a84c;border-radius:0 12px 12px 0;padding:18px 22px;margin-top:24px;animation:sbFadeUp .7s .3s ease both;}
        .sb-notice-label{font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#c9a84c;margin-bottom:8px;}
        .sb-notice-text{font-size:13px;color:#a8c5b0;line-height:1.8;}
        .sb-notice-text strong{color:#e8ede9;font-weight:500;}
        .sb-footer{text-align:center;margin-top:44px;font-size:11px;color:#4a7055;letter-spacing:.06em;animation:sbFadeUp .7s .4s ease both;}
        .sb-footer span{color:#c9a84c;}
        .sb-overlay{position:fixed;inset:0;background:rgba(11,26,31,.92);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);animation:sbFadeIn .35s ease;}
        .sb-success-card{background:#0e2228;border:1px solid rgba(201,168,76,.25);border-radius:14px;padding:44px 36px;text-align:center;max-width:340px;animation:sbScaleIn .4s .05s cubic-bezier(.175,.885,.32,1.275) both;}
        .sb-success-check{width:60px;height:60px;background:rgba(93,184,122,.12);border:1px solid rgba(93,184,122,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;animation:sbPopIn .45s .35s cubic-bezier(.175,.885,.32,1.275) both;}
        .sb-success-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;margin-bottom:8px;}
        .sb-success-msg{font-size:13px;color:#7a9e85;line-height:1.65;}
        .sb-success-ref{background:#112830;border:1px solid #1e3840;border-radius:10px;padding:12px 16px;margin:18px 0;font-size:11px;color:#4a7055;}
        .sb-success-ref span{display:block;font-size:15px;font-weight:600;color:#c9a84c;letter-spacing:.1em;margin-top:4px;}
        .sb-success-close{background:#c9a84c;color:#0b1a1f;border:none;border-radius:10px;padding:12px 28px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;}
        .sb-success-close:hover{opacity:.85;}
        @keyframes sbFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sbFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes sbScaleIn{from{opacity:0;transform:scale(.87)}to{opacity:1;transform:scale(1)}}
        @keyframes sbPopIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes sbShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
        .sb-qr-clickable{cursor:pointer;transition:transform .2s,border-color .2s;}
        .sb-qr-clickable:hover{transform:translateY(-3px);border-color:rgba(201,168,76,.4);}
        .sb-qr-ph-img{position:relative;overflow:hidden;border-radius:8px;}
        .sb-qr-zoom-hint{position:absolute;bottom:0;left:0;right:0;background:rgba(11,26,31,.75);color:#c9a84c;font-size:10px;font-weight:600;letter-spacing:.08em;text-align:center;padding:5px;opacity:0;transition:opacity .2s;}
        .sb-qr-clickable:hover .sb-qr-zoom-hint{opacity:1;}
        .sb-qr-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;align-items:center;justify-content:center;animation:sbFadeIn .2s ease;backdrop-filter:blur(12px);}
        .sb-qr-lightbox-inner{background:#0e2228;border:1px solid rgba(201,168,76,.3);border-radius:16px;padding:20px;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:12px;animation:sbScaleIn .25s cubic-bezier(.175,.885,.32,1.275) both;}
        .sb-qr-lightbox-header{width:100%;display:flex;justify-content:space-between;align-items:center;}
        .sb-qr-lightbox-label{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#c9a84c;letter-spacing:.06em;}
        .sb-qr-lightbox-close{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.25);color:#c9a84c;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .2s;}
        .sb-qr-lightbox-close:hover{background:rgba(201,168,76,.25);}
        .sb-qr-lightbox-img{width:min(70vw,380px);height:min(70vw,380px);object-fit:contain;border-radius:12px;background:#fff;padding:12px;}
        .sb-qr-lightbox-hint{font-size:11px;color:#4a7055;letter-spacing:.08em;}
      `}</style>

      <div className="sb-wrap">
        <div className="sb-inner">

          <div className="sb-header">
            <div className="sb-brand-logos">
              {[
                {src:"/logo-goldblessing.png",  alt:"Gold Blessing"},
                {src:"/logo-soleblessing.png",  alt:"Sole Blessing"},
                {src:"/logo-luntian.png",        alt:"Luntian Log Cabin"},
                {src:"/logo-mhc.png",            alt:"Must Have Corner"},
                {src:"/logo-aster.png",          alt:"Aster"},
                {src:"/logo-tyg.png",            alt:"TYG Services"},
              ].map((b,i)=>(
                <div key={i} className="sb-brand-logo" title={b.alt}>
                  <img src={b.src} alt={b.alt}/>
                </div>
              ))}
            </div>
            <div className="sb-eyebrow">TYG Services</div>
            <h1 className="sb-title">Payment Portal</h1>
            <div className="sb-divider"/>
            <p className="sb-sub">Choose your payment method, then submit your proof below</p>
          </div>

          <div className="sb-layout">

            {/* LEFT: Modes of Payment */}
            <div className="sb-panel">
              <div className="sb-panel-header">
                <div className="sb-panel-icon">🏦</div>
                <div><div className="sb-panel-title">Modes of Payment</div><div className="sb-panel-sub">Bank transfer fees may apply</div></div>
              </div>
              <div className="sb-panel-body">
                <div className="sb-tab-nav">
                  {(["bank","ewallet","qr"] as const).map(t=>(
                    <button key={t} className={`sb-tab-btn${activeTab===t?" active":""}`} onClick={()=>setActiveTab(t)}>
                      {t==="bank"?"Bank":t==="ewallet"?"E-Wallet":"QR"}
                    </button>
                  ))}
                </div>

                <div className={`sb-tab-section${activeTab==="bank"?" active":""}`}>
                  {[
                    {cls:"sb-badge-bdo",lbl:"BDO",bank:"BDO Unibank",holder:"Legeryn Pia",num:"0126-000-62617",copy:"012600062617"},
                    {cls:"sb-badge-bpi",lbl:"BPI",bank:"Bank of Philippine Islands",holder:"Legeryn Pia",num:"1539-235-628",copy:"1539235628"},
                    {cls:"sb-badge-ub",lbl:<>Union<br/>Bank</>,bank:"UnionBank Philippines",holder:"Legeryn Pia",num:"1093-2100-0528",copy:"109321000528"},
                  ].map((a,i)=>(
                    <div key={i} className="sb-pay-card">
                      <div className={`sb-bank-badge ${a.cls}`}>{a.lbl}</div>
                      <div className="sb-pay-info">
                        <div className="sb-pay-bank">{a.bank}</div>
                        <div className="sb-pay-holder">{a.holder}</div>
                        <div className="sb-pay-number">{a.num}</div>
                      </div>
                      <button className="sb-copy-btn" onClick={e=>copyText(a.copy,e.currentTarget)}>Copy</button>
                    </div>
                  ))}
                </div>

                <div className={`sb-tab-section${activeTab==="ewallet"?" active":""}`}>
                  {[
                    {holder:"Legeryn Pia",num:"0966 960 6060",copy:"09669606060"},
                    {holder:"Michael Talla",num:"0935 763 7498",copy:"09357637498"},
                  ].map((g,i)=>(
                    <div key={i} className="sb-pay-card">
                      <div className="sb-bank-badge sb-badge-gcash">G<br/>Cash</div>
                      <div className="sb-pay-info">
                        <div className="sb-pay-bank">GCash</div>
                        <div className="sb-pay-holder">{g.holder}</div>
                        <div className="sb-pay-number">{g.num}</div>
                      </div>
                      <button className="sb-copy-btn" onClick={e=>copyText(g.copy,e.currentTarget)}>Copy</button>
                    </div>
                  ))}
                </div>

                <div className={`sb-tab-section${activeTab==="qr"?" active":""}`}>
                  <div className="sb-qr-grid">
                    {[
                      {src:"/qr-bdo.png",  label:"BDO",   color:"#4d90d6", name:"BDOSB",     acct:"••••2617"},
                      {src:"/qr-bpi.png",  label:"BPI",   color:"#e05a6b", name:"BPISB",     acct:"•••••628"},
                      {src:"/qr-gcash.png",label:"GCash", color:"#4d90d6", name:"LE****N P.", acct:"0966 ••••"},
                    ].map((q,i)=>(
                      <div key={i} className="sb-qr-card sb-qr-clickable" onClick={()=>setLightbox({src:q.src,label:q.label})} title="Tap to enlarge">
                        <div className="sb-qr-label" style={{color:q.color}}>{q.label}</div>
                        <div className="sb-qr-ph sb-qr-ph-img">
                          <img src={q.src} alt={`${q.label} QR Code`}/>
                          <div className="sb-qr-zoom-hint">🔍 Tap to enlarge</div>
                        </div>
                        <div className="sb-qr-name">{q.name}</div>
                        <div className="sb-qr-acct">{q.acct}</div>
                        <div className="sb-instapay">InstaPay</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Upload Proof */}
            <div className="sb-panel sb-upload-panel" id="sb-upload-panel">
              <div className="sb-panel-header">
                <div className="sb-panel-icon">📎</div>
                <div><div className="sb-panel-title">Submit Proof</div><div className="sb-panel-sub">Upload your payment screenshot</div></div>
              </div>
              <div className="sb-panel-body">

                <div className="sb-field">
                  <label>Order ID</label>
                  <input type="text" placeholder="e.g. AB 0277" value={orderId} onChange={e=>setOrderId(e.target.value)}/>
                </div>

                <div className="sb-field-row">
                  <div className="sb-field">
                    <label>Customer Name</label>
                    <input type="text" placeholder="Full name" value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
                  </div>
                  <div className="sb-field">
                    <label>Amount (₱)</label>
                    <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}/>
                  </div>
                </div>

                <span className="sb-method-label">Payment Method</span>
                <div className="sb-method-grid">
                  {[{m:"GCash",e:"💙"},{m:"Maya",e:"💚"},{m:"Bank",e:"🏦"},{m:"COD",e:"💵"}].map(({m,e})=>(
                    <button key={m} className={`sb-method-btn${method===m?" active":""}`} onClick={()=>setMethod(m)}>
                      <span className="sb-method-emoji">{e}</span>{m}
                    </button>
                  ))}
                </div>

                <div className="sb-field">
                  <label>Reference / Transaction No.</label>
                  <input type="text" placeholder="e.g. 123456789012" value={refNo} onChange={e=>setRefNo(e.target.value)}/>
                </div>

                <span className="sb-method-label">Payment Proof</span>
                {!file ? (
                  <div className="sb-upload-zone" onClick={()=>fileRef.current?.click()}
                    onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor="#c9a84c";}}
                    onDragLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="";}}
                    onDrop={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor="";const f=e.dataTransfer.files[0];if(f)handleFile(f);}}>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
                    <span className="sb-upload-icon">📎</span>
                    <p className="sb-upload-main">Drop screenshot or tap to upload</p>
                    <p className="sb-upload-sub">GCash / bank transfer confirmation</p>
                    <div className="sb-format-tags">
                      {["JPG","PNG","PDF"].map(f=><span key={f} className="sb-format-tag">{f}</span>)}
                    </div>
                  </div>
                ) : (
                  <div className="sb-preview">
                    {preview && <img src={preview} alt="Preview"/>}
                    <div className="sb-preview-info">
                      <span className="sb-preview-name">{file.name}</span>
                      <button className="sb-remove-btn" onClick={()=>{setFile(null);setPreview(null);}}>✕</button>
                    </div>
                  </div>
                )}

                {submitting && <div className="sb-progress"><div className="sb-progress-fill" style={{width:`${progress}%`}}/></div>}

                <button className="sb-submit" disabled={submitting} onClick={handleSubmit}>
                  {submitting?"Submitting…":"Submit Payment Proof"}
                </button>
              </div>
            </div>
          </div>

          <div className="sb-notice">
            <div className="sb-notice-label">📋 After Payment</div>
            <p className="sb-notice-text">
              Once payment is made, please <strong>send your proof of payment</strong> via this portal.
              A <strong>Google Form will be sent</strong> to collect your shipping information.<br/><br/>
              Replies may be slightly delayed as our admins are attending to multiple inquiries. We appreciate your patience and understanding. 🤍
            </p>
          </div>

          <div className="sb-footer">© 2025 <span>TYG Services</span> — All Businesses by Legeryn Pia</div>
        </div>
      </div>

      {success && (
        <div className="sb-overlay">
          <div className="sb-success-card">
            <div className="sb-success-check">✓</div>
            <h2 className="sb-success-title">Payment Received</h2>
            <p className="sb-success-msg">Your proof has been submitted. We'll verify and update your order shortly.</p>
            <div className="sb-success-ref">Submission Reference<span>{refId}</span></div>
            <button className="sb-success-close" onClick={resetForm}>Submit Another</button>
          </div>
        </div>
      )}

      {/* QR Lightbox */}
      {lightbox && (
        <div className="sb-qr-lightbox" onClick={()=>setLightbox(null)}>
          <div className="sb-qr-lightbox-inner" onClick={e=>e.stopPropagation()}>
            <div className="sb-qr-lightbox-header">
              <span className="sb-qr-lightbox-label">{lightbox.label} — Scan to Pay</span>
              <button className="sb-qr-lightbox-close" onClick={()=>setLightbox(null)}>✕</button>
            </div>
            <img src={lightbox.src} alt={`${lightbox.label} QR`} className="sb-qr-lightbox-img"/>
            <p className="sb-qr-lightbox-hint">Tap outside to close</p>
          </div>
        </div>
      )}
    </>
  );
}
