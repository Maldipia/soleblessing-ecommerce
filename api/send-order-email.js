// Branded order emails (Nike/Adidas-style, with product photos), driven by the
// DB order row — NOT the sheet. Types:
//   order_received   → sent automatically right after a website checkout
//   payment_verified → sent when admin verifies the payment
//   shipped          → tracking email
//   invoice_ready    → confidential secure-link notification (NO order details)
// Sending is NATIVE (server/mailer.js — Resend or Gmail SMTP). No Google Apps
// Script involved. Every attempt is logged to sb_email_log and stamps sb_orders.
import { verifyCredential, isOwnerOrManager, cors } from '../server/auth.js';
import { sendBrandedEmail } from '../server/mailer.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SITE = 'https://www.soleblessingofficial.com';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

const peso = c => '₱' + Math.round((c || 0) / 100).toLocaleString('en-PH');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

// "Invoice ready" notification — DELIBERATELY MINIMAL AND CONFIDENTIAL.
// Per Pia: the email is only a notification, never the invoice itself. It must
// carry NO amounts, NO items, NO quantities, NO shipping fee, NO address — the
// customer sees those only after opening the secure link. Do not add order
// details here.
export { buildShippedHtml };
export function buildInvoiceReadyHtml(o, inviteUrl, expiresAt) {
  const firstName = esc((o.customer_name || 'there').trim().split(/\s+/)[0]);
  const expDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })
    : '';
  const days = expiresAt ? Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : 7;
  // COD orders carry Pia's COD Shipping Policy card (approved mock, Nov 25).
  // Policy text only — the email stays confidential: no amounts, no items.
  const isCOD = String(o.payment_method || '').toUpperCase() === 'COD';
  const codCard = isCOD ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #F8C89B;background:#FFF9F4;border-radius:10px;margin:14px 0 0"><tr>
        <td style="padding:16px 18px">
          <div style="font-size:12px;font-weight:900;color:#b45309;letter-spacing:.08em;margin-bottom:8px">&#128666; SOLEBLESSING &middot; COD SHIPPING POLICY</div>
          <p style="font-size:12.5px;color:#4a4a46;line-height:1.7;margin:0 0 8px">Thank you for ordering with SoleBlessing!</p>
          <p style="font-size:12.5px;color:#4a4a46;line-height:1.7;margin:0 0 8px">For COD orders, the <b>shipping fee must be paid in advance before dispatch</b>. We pay the courier upfront to secure your shipment and avoid losses from unclaimed or refused deliveries. The exact amount is shown on your invoice.</p>
          <p style="font-size:12.5px;color:#4a4a46;line-height:1.7;margin:0">Once the shipping fee is confirmed, we'll dispatch your order. The <b>remaining product balance will still be collected by the courier upon delivery</b>. Thank you for your understanding and cooperation! &#128591;</p>
        </td>
      </tr></table>` : '';
  return `<!doctype html><html><body style="margin:0;background:#ece9e4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#050f12;padding:26px 32px;text-align:center">
      <img src="${SITE}/sb-logo.jpg" width="56" height="56" alt="SoleBlessing" style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#ffffff;margin-bottom:10px">
      <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:.18em">SOLE<span style="color:#C9A84C">BLESSING</span></div>
      <div style="color:#8f969b;font-size:10px;letter-spacing:.3em;margin-top:6px;text-transform:uppercase">Sneakers &middot; Apparel &middot; Lifestyle</div>
    </td></tr>
    <tr><td style="padding:36px 32px 28px">
      <div style="width:58px;height:58px;border-radius:50%;background:#faf3e3;color:#b7791f;font-size:28px;line-height:58px;text-align:center;margin:0 auto 16px">&#9993;</div>
      <h1 style="font-size:21px;color:#0d2430;text-align:center;margin:0 0 8px">Hi ${firstName}! &#128075;</h1>
      <p style="color:#444444;font-size:14px;text-align:center;margin:0 0 4px;line-height:1.6">Your SoleBlessing online invoice is ready.</p>
      <p style="color:#8a8f94;font-size:13px;text-align:center;margin:0 0 26px;line-height:1.6">Please click the button below to view your invoice and complete your payment.</p>
      <a href="${esc(inviteUrl)}" style="display:block;background:#C9A84C;color:#050f12;text-decoration:none;text-align:center;padding:16px;border-radius:10px;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">&#128196; Click Here to View Your Invoice &#8594;</a>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6e3;border-radius:10px;margin:22px 0 0"><tr>
        <td style="padding:14px 18px;font-size:12.5px;color:#6b5a1e;line-height:1.6">
          &#9201; This secure invoice link will expire in <b>${days} day${days === 1 ? '' : 's'}</b>${expDate ? ` (on ${expDate})` : ''}. After that, just message us for a new link.
        </td>
      </tr></table>${codCard}
      <p style="color:#8a8f94;font-size:13px;text-align:center;font-style:italic;margin:26px 0 0">Thank you for shopping with SoleBlessing!</p>
    </td></tr>
    <tr><td style="padding:22px 32px;text-align:center;color:#9aa0a6;font-size:11px;line-height:1.7;border-top:1px solid #f0f0f0">
      Need help? Just reply to this email, write to <a href="mailto:soleblessing@gmail.com" style="color:#8a6d25;text-decoration:none;font-weight:bold">soleblessing@gmail.com</a> or message us at <a href="https://m.me/SoleBlessingOfficial" style="color:#8a6d25;text-decoration:none;font-weight:bold">m.me/SoleBlessingOfficial</a><br>
      <b style="color:#C9A84C">SOLEBLESSING</b> &middot; soleblessingofficial.com &middot; Amadeo, Cavite, Philippines &#127477;&#127469;
    </td></tr>
  </table></td></tr></table></body></html>`;
}

// Courier-aware public tracking link; falls back to the site's own tracker.
function trackingUrl(courier, ref, orderNumber) {
  const c = String(courier || '').toLowerCase();
  const r = encodeURIComponent(String(ref || ''));
  if (r && c.includes('lbc')) return `https://www.lbcexpress.com/track/?tracking_no=${r}`;
  if (r && (c.includes('j&t') || c.includes('jt'))) return `https://www.jtexpress.ph/trajectoryQuery?billcode=${r}`;
  if (r && c.includes('flash')) return `https://www.flashexpress.ph/tracking/?se=${r}`;
  if (r && c.includes('ninja')) return `https://www.ninjavan.co/en-ph/tracking?id=${r}`;
  return `${SITE}/order/${encodeURIComponent(orderNumber || '')}`;
}

// "On The Way" shipping email — per Pia's Shipment Tracking mockup (Nov 25):
// shipping details card, Track Your Package button, Delivering To, ID tip.
function buildShippedHtml(o) {
  const firstName = esc((o.customer_name || 'there').trim().split(/\s+/)[0]);
  const courier = esc(o.courier || 'Courier');
  const track = o.tracking_reference ? esc(o.tracking_reference) : '';
  const url = trackingUrl(o.courier, o.tracking_reference, o.order_number);
  const external = !url.startsWith(SITE);
  const row = (label, value) => `
    <tr><td style="padding:9px 0;border-bottom:1px solid #eeeeee;font-size:13px;color:#555555;font-weight:bold;width:110px">${label}</td>
        <td style="padding:9px 0;border-bottom:1px solid #eeeeee;font-size:13.5px;color:#0d2430;font-weight:900">${value}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#ece9e4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#050f12;padding:24px 32px;text-align:center">
      <img src="${SITE}/sb-logo.jpg" width="52" height="52" alt="SoleBlessing" style="display:inline-block;width:52px;height:52px;border-radius:50%;background:#ffffff;margin-bottom:8px">
      <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:.18em">SOLE<span style="color:#EA580C">BLESSING</span></div>
      <div style="color:#8f969b;font-size:10px;letter-spacing:.3em;margin-top:6px;text-transform:uppercase">Sneakers &middot; Apparel &middot; Lifestyle</div>
    </td></tr>
    <tr><td style="padding:30px 32px 10px">
      <h1 style="font-size:24px;color:#0d2430;margin:0 0 16px;text-align:center">&#128666; Your Order Is <span style="color:#EA580C">On The Way!</span></h1>
      <p style="font-size:16px;font-weight:900;color:#0d2430;margin:0 0 4px">Great news, ${firstName}!</p>
      <p style="font-size:13.5px;color:#555555;margin:0 0 18px;line-height:1.6">Your order has been shipped and is now in transit to you.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;border-radius:12px"><tr><td style="padding:16px 20px">
        <p style="font-size:14px;font-weight:900;color:#0d2430;margin:0 0 6px">&#128230; Shipping Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('&#128203; Order ID:', `<span style="background:#e9e7e2;border-radius:8px;padding:2px 10px">${esc(o.order_number)}</span>`)}
          ${row('&#128666; Courier:', courier)}
          ${track ? row('&#124;&#124;&#124; Tracking #:', `<span style="font-family:monospace;letter-spacing:.04em;background:#ffffff;border:1px solid #e4e2dd;border-radius:8px;padding:3px 10px;display:inline-block">${track}</span><br><span style="font-size:10px;color:#9aa0a6;font-weight:normal">press &amp; hold the number to copy</span>`) : ''}
          ${row('&#128197; Est. Delivery:', '7&ndash;10 working days')}
        </table>
      </td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 0 6px">
        <a href="${url}" style="display:block;background:#EA580C;color:#ffffff;text-decoration:none;text-align:center;padding:16px;border-radius:999px;font-size:15px;font-weight:900;letter-spacing:.02em">&#128205; Track Your Package &#8594;</a>
      </td></tr></table>
      <p style="font-size:11px;color:#8a8f94;text-align:center;margin:0 0 18px;line-height:1.5">${external
        ? `This will open ${courier} tracking:<br>${esc(url.replace('https://', ''))}`
        : 'This will open your order tracking page on soleblessingofficial.com'}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #EA580C;background:#fbfaf7;border-radius:10px"><tr><td style="padding:14px 18px">
        <p style="font-size:13px;font-weight:900;color:#0d2430;margin:0 0 4px">&#128205; Delivering To</p>
        <p style="font-size:13px;color:#444444;margin:0;line-height:1.7">
          <b style="color:#0d2430">${esc(o.customer_name)}</b><br>
          ${esc(o.shipping_address)}<br>
          &#128222; ${esc(o.contact_number)}
        </p>
      </td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf3d8;border-radius:10px;margin:16px 0 20px"><tr><td style="padding:12px 18px;font-size:12px;color:#7a5d13;line-height:1.6">
        &#8505;&#65039; <b>Tip:</b> Please ensure someone is available to receive the package and have a valid ID ready for verification.
      </td></tr></table>
    </td></tr>
    <tr><td style="background:#0a0a0a;padding:14px 24px;text-align:center">
      <p style="color:#ffffff;font-size:12px;margin:0">&#9993;&#65039; Questions about your delivery? Reply to this email and our team will be happy to assist you.</p>
    </td></tr>
    <tr><td style="padding:18px 32px;text-align:center;color:#9aa0a6;font-size:11px;line-height:1.7">
      <b style="color:#EA580C">SOLEBLESSING</b> &middot; soleblessingofficial.com &middot; <a href="https://m.me/SoleBlessingOfficial" style="color:#8a6d25;text-decoration:none;font-weight:bold">m.me/SoleBlessingOfficial</a> &middot; Amadeo, Cavite &#127477;&#127469;
    </td></tr>
  </table></td></tr></table></body></html>`;
}

function buildHtml(o, type) {
  const verified = type === 'payment_verified';
  const shipped = type === 'shipped';
  const cod = (o.payment_method || '').toLowerCase() === 'cod';
  const firstName = esc((o.customer_name || 'there').trim().split(/\s+/)[0]);
  const pill = shipped
    ? `<span style="background:#6d4fc3;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">SHIPPED &#128666;</span>`
    : verified
    ? `<span style="background:#1a7f4e;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">PAID &#10003;</span>`
    : cod
      ? `<span style="background:#0d2430;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">COD — PAY ON DELIVERY</span>`
      : `<span style="background:#b7791f;color:#ffffff;font-size:10px;font-weight:bold;padding:4px 12px;border-radius:999px;letter-spacing:.05em">AWAITING PAYMENT</span>`;
  const heading = shipped ? `On the way, ${firstName}! &#128666;` : verified ? `Salamat, ${firstName}! Payment confirmed.` : `Salamat, ${firstName}! Order received.`;
  const trackLine = shipped && (o.courier || o.tracking_reference)
    ? `${esc(o.courier || 'Courier')}${o.tracking_reference ? ` — tracking no. <b style="font-family:monospace">${esc(o.tracking_reference)}</b>` : ''}`
    : '';
  const sub = shipped
    ? `Your pairs are with the courier${trackLine ? `: ${trackLine}` : ''}. Keep your phone open for the delivery!`
    : verified
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
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY || !ADMIN_PASSWORD) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, order_number, type } = body || {};
  if (!['order_received', 'payment_verified', 'shipped', 'invoice_ready'].includes(type)) return res.status(400).json({ error: 'type must be order_received, payment_verified, shipped or invoice_ready' });

  const cred = await verifyCredential({ password, token: body && body.token });
  if (!isOwnerOrManager(cred)) return res.status(401).json({ error: 'unauthorized' });
  if (!order_number) return res.status(400).json({ error: 'order_number required' });

  try {
    const ores = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order_number)}&select=*`, { headers: H });
    const [o] = ores.ok ? await ores.json() : [];
    if (!o) return res.status(404).json({ error: 'order not found' });
    if (!o.customer_email) return res.status(422).json({ error: 'no email on this order' });

    let subject, html;
    if (type === 'invoice_ready') {
      // The confidential notification: button carries the SECURE token link,
      // never the bare invoice URL, and never any order details. The link must
      // already exist (issued from the invoice editor) so what we email is
      // exactly what the admin saw.
      const tres = await fetch(`${SUPABASE_URL}/rest/v1/sb_invoice_tokens?order_number=eq.${encodeURIComponent(order_number)}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=token,expires_at&order=issued_at.desc&limit=1`, { headers: H });
      const [tok] = tres.ok ? await tres.json() : [];
      if (!tok) return res.status(422).json({ error: 'no active customer link — generate the invoice link first' });
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.soleblessingofficial.com';
      subject = 'Your SoleBlessing online invoice is ready';
      html = buildInvoiceReadyHtml(o, `https://${host}/invoice/t/${tok.token}`, tok.expires_at);
    } else {
      subject = type === 'shipped'
        ? `Your order is on the way! ${o.courier ? o.courier + ' ' : ''}${o.tracking_reference || ''} — ${o.order_number} · SoleBlessing`
        : type === 'payment_verified'
        ? `Payment confirmed — ${o.order_number} · SoleBlessing`
        : `Order received — ${o.order_number} · SoleBlessing`;
      html = type === 'shipped' ? buildShippedHtml(o) : buildHtml(o, type);
    }

    // NATIVE send — no GAS. Status stamps happen ONLY on a confirmed send.
    const out = await sendBrandedEmail({ to: o.customer_email, subject, html });

    await fetch(`${SUPABASE_URL}/rest/v1/sb_email_log`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ order_number: o.order_number, email_type: type, sent_to: o.customer_email, ok: !!out.success, error: out.success ? null : (out.message || 'send failed') }),
    }).catch(() => {});

    if (!out.success) return res.status(out.notConfigured ? 503 : 422).json({ error: out.message || 'send failed' });

    const stamp = type === 'shipped' ? { tracking_sent_at: new Date().toISOString() }
      : (type === 'payment_verified' || type === 'invoice_ready') ? { invoice_sent_at: new Date().toISOString() }
      : { confirmation_sent_at: new Date().toISOString() };
    await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order_number)}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ ...stamp, updated_at: new Date().toISOString() }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, email: o.customer_email, type });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
