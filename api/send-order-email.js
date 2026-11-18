// Branded order emails (Nike/Adidas-style, with product photos), driven by the
// DB order row — NOT the sheet. Two types:
//   order_received   → sent automatically right after a website checkout
//   payment_verified → sent when admin verifies the payment
// Sending goes through the GAS webhook's send_html_email action (her Gmail);
// every attempt is logged to sb_email_log and stamps sb_orders.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GAS_HOOK = process.env.GAS_ORDER_WEBHOOK || '';
const SITE = 'https://www.soleblessingofficial.com';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

const peso = c => '₱' + Math.round((c || 0) / 100).toLocaleString('en-PH');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

function buildHtml(o, type) {
  const verified = type === 'payment_verified';
  const cod = (o.payment_method || '').toLowerCase() === 'cod';
  const firstName = esc((o.customer_name || 'there').trim().split(/\s+/)[0]);
  const pill = verified
    ? `<span style="background:#1a7f4e;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">PAID &#10003;</span>`
    : cod
      ? `<span style="background:#0d2430;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">COD — PAY ON DELIVERY</span>`
      : `<span style="background:#b7791f;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">AWAITING PAYMENT</span>`;
  const heading = verified ? `Salamat, ${firstName}! Payment confirmed.` : `Salamat, ${firstName}! Order received.`;
  const sub = verified
    ? `Payment verified — your order is being packed. We'll email the tracking number once it ships.`
    : cod
      ? `Your order is in! Pay cash when it arrives — we'll email the tracking number once it ships.`
      : `Your order is reserved. Settle the payment and upload your proof so we can pack it right away.`;
  const cta = verified
    ? (o.invoice_url
        ? `<a href="https://www.soleblessingofficial.com/invoice/${encodeURIComponent(o.order_number)}" style="display:block;background:#0d2430;color:#ffffff;text-decoration:none;text-align:center;padding:15px;border-radius:10px;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">View My Invoice &#8594;</a>`
        : `<a href="${SITE}" style="display:block;background:#0d2430;color:#ffffff;text-decoration:none;text-align:center;padding:15px;border-radius:10px;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">Shop More &#8594;</a>`)
    : cod
      ? `<a href="${SITE}" style="display:block;background:#0d2430;color:#ffffff;text-decoration:none;text-align:center;padding:15px;border-radius:10px;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">Shop More &#8594;</a>`
      : `<a href="${SITE}/upload-payment?order=${encodeURIComponent(o.order_number)}&name=${encodeURIComponent(o.customer_name || '')}" style="display:block;background:#C9A84C;color:#050f12;text-decoration:none;text-align:center;padding:15px;border-radius:10px;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">Upload Payment Proof &#8594;</a>`;

  const items = (Array.isArray(o.items) ? o.items : []).map(it => `
    <tr><td style="padding:0 0 12px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:12px"><tr>
        <td style="padding:12px;width:92px">${it.imageUrl
          ? `<img src="${esc(it.imageUrl)}" width="92" height="92" style="display:block;width:92px;height:92px;border-radius:8px;object-fit:cover;background:#EDE9E3" alt="">`
          : `<div style="width:92px;height:92px;border-radius:8px;background:#EDE9E3"></div>`}</td>
        <td style="padding:12px 12px 12px 4px;vertical-align:top">
          <div style="font-size:12px;color:#8a8f94">${esc(it.brand || '')}</div>
          <div style="font-size:14px;font-weight:bold;color:#0d2430;margin:3px 0 2px">${esc(it.name || '')}</div>
          <div style="font-size:12px;color:#8a8f94">Size ${esc(it.size || '-')} &nbsp;&middot;&nbsp; Qty ${esc(it.qty || 1)}</div>
          <div style="font-size:15px;font-weight:900;color:#0d2430;margin-top:8px">${peso(it.price)}</div>
        </td>
      </tr></table>
    </td></tr>`).join('');

  const discountRow = (o.discount_amount || 0) > 0
    ? `<tr><td style="font-size:13px;color:#1a7f4e;padding:5px 0">Discount${o.promo_code ? ` (${esc(o.promo_code)})` : ''}</td><td style="font-size:13px;color:#1a7f4e;padding:5px 0" align="right">&#8722;${peso(o.discount_amount)}</td></tr>` : '';

  return `<!doctype html><html><body style="margin:0;background:#ece9e4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#050f12;padding:28px 32px;text-align:center">
      <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:.18em">SOLE<span style="color:#C9A84C">BLESSING</span></div>
      <div style="color:#8f969b;font-size:10px;letter-spacing:.3em;margin-top:6px;text-transform:uppercase">Sneakers &middot; Fashion &middot; Lifestyle</div>
    </td></tr>
    <tr><td style="background:#C9A84C;color:#050f12;text-align:center;padding:10px;font-size:12px;font-weight:bold;letter-spacing:.08em">&#128666; SHIPS NATIONWIDE &middot; LEGIT. FRESH. YOURS.</td></tr>
    <tr><td style="padding:32px">
      <div style="width:54px;height:54px;border-radius:50%;background:${verified ? '#e8f5ee' : '#faf3e3'};color:${verified ? '#1a7f4e' : '#b7791f'};font-size:28px;line-height:54px;text-align:center;margin:0 auto 14px">${verified ? '&#10003;' : '&#128230;'}</div>
      <h1 style="font-size:20px;color:#0d2430;text-align:center;margin:0 0 6px">${heading}</h1>
      <p style="color:#8a8f94;font-size:13px;text-align:center;margin:0 0 24px;line-height:1.5">${sub}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;border-radius:10px;margin-bottom:24px"><tr>
        <td style="padding:14px 18px"><b style="color:#0d2430;font-size:14px">${esc(o.order_number)}</b><br>
          <span style="font-size:11px;color:#8a8f94">${new Date(o.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} &middot; ${esc((o.payment_method || '').toUpperCase())}</span></td>
        <td style="padding:14px 18px" align="right">${pill}</td>
      </tr></table>
      <p style="font-size:11px;font-weight:bold;letter-spacing:.15em;color:#8a6d25;text-transform:uppercase;margin:0 0 10px">Your Order</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 24px">
        <tr><td style="font-size:13px;color:#555555;padding:5px 0">Subtotal</td><td style="font-size:13px;color:#0d2430;padding:5px 0" align="right">${peso(o.subtotal)}</td></tr>
        <tr><td style="font-size:13px;color:#555555;padding:5px 0">Shipping</td><td style="font-size:13px;color:#0d2430;padding:5px 0" align="right">${(o.shipping_fee || 0) > 0 ? peso(o.shipping_fee) : 'FREE'}</td></tr>
        ${discountRow}
        <tr><td style="border-top:2px solid #0d2430;padding-top:10px;font-size:16px;font-weight:900;color:#0d2430">${verified ? 'Total Paid' : 'Total'}</td><td style="border-top:2px solid #0d2430;padding-top:10px;font-size:16px;font-weight:900;color:#0d2430" align="right">${peso(o.total)}</td></tr>
      </table>
      <p style="font-size:11px;font-weight:bold;letter-spacing:.15em;color:#8a6d25;text-transform:uppercase;margin:0 0 10px">Delivery Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;border-radius:10px;margin-bottom:24px"><tr><td style="padding:16px 18px;font-size:13px;color:#444444;line-height:1.6">
        <b style="color:#0d2430">${esc(o.customer_name)}</b>${o.facebook_name ? ` &middot; FB: ${esc(o.facebook_name)}` : ''}<br>
        ${esc(o.shipping_address)}<br>
        ${esc(o.contact_number)}${o.customer_email ? ` &middot; ${esc(o.customer_email)}` : ''}
      </td></tr></table>
      ${cta}
    </td></tr>
    <tr><td style="padding:22px 32px;text-align:center;color:#9aa0a6;font-size:11px;line-height:1.7;border-top:1px solid #f0f0f0">
      Questions? Just reply to this email or message us on Facebook.<br>
      <b style="color:#C9A84C">SOLEBLESSING</b> &middot; soleblessingofficial.com &middot; Authenticated sneakers shipped across the Philippines
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY || !ADMIN_PASSWORD) return res.status(500).json({ error: 'server not configured' });
  if (!GAS_HOOK) return res.status(500).json({ error: 'GAS_ORDER_WEBHOOK not set' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, order_number, type } = body || {};
  if (!['order_received', 'payment_verified'].includes(type)) return res.status(400).json({ error: 'type must be order_received or payment_verified' });

  let authed = password === ADMIN_PASSWORD;
  if (!authed && password) { // manager PIN may also send
    try {
      const sres = await fetch(`${SUPABASE_URL}/rest/v1/sb_settings?key=eq.staff_admins&select=value`, { headers: H });
      const [row] = sres.ok ? await sres.json() : [];
      const list = row ? JSON.parse(row.value || '[]') : [];
      authed = !!list.find(s => s && s.active !== false && s.role === 'manager' && String(s.pin) === String(password));
    } catch {}
  }
  if (!authed) return res.status(401).json({ error: 'unauthorized' });
  if (!order_number) return res.status(400).json({ error: 'order_number required' });

  try {
    // GAS must carry the send_html_email action first — gated so we never post
    // an unknown action (the sheet router would log it as a junk order row).
    const gres = await fetch(`${SUPABASE_URL}/rest/v1/sb_settings?key=eq.gas_email_patched&select=value`, { headers: H });
    const [grow] = gres.ok ? await gres.json() : [];
    if (!grow || String(grow.value) !== '1')
      return res.status(422).json({ error: 'GAS email patch not applied yet — apply gas/PATCH-branded-email.md first' });

    const ores = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order_number)}&select=*`, { headers: H });
    const [o] = ores.ok ? await ores.json() : [];
    if (!o) return res.status(404).json({ error: 'order not found' });
    if (!o.customer_email) return res.status(422).json({ error: 'no email on this order' });

    const subject = type === 'payment_verified'
      ? `Payment confirmed — ${o.order_number} · SoleBlessing`
      : `Order received — ${o.order_number} · SoleBlessing`;
    const html = buildHtml(o, type);

    const g = await fetch(GAS_HOOK, {
      method: 'POST', redirect: 'follow',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'send_html_email', to: o.customer_email, subject, html }),
    });
    let out; try { out = JSON.parse(await g.text()); } catch { out = { success: false, message: 'GAS returned non-JSON — redeploy the webhook with a New version' }; }

    await fetch(`${SUPABASE_URL}/rest/v1/sb_email_log`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ order_number: o.order_number, email_type: type, sent_to: o.customer_email, ok: !!out.success, error: out.success ? null : (out.message || 'send failed') }),
    }).catch(() => {});

    if (!out.success) return res.status(422).json({ error: out.message || 'send failed' });

    const stamp = type === 'payment_verified' ? { invoice_sent_at: new Date().toISOString() } : { confirmation_sent_at: new Date().toISOString() };
    await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order_number)}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ ...stamp, updated_at: new Date().toISOString() }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, email: o.customer_email, type });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
