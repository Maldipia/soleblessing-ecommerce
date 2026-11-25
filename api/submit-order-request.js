// Native Online Order Form — submission endpoint.
// Customers submit INFORMATION ONLY (no products, no prices, no stock effects).
// Admin encodes products + invoice afterwards (existing dashboard flow).
//
// Security: CORS-locked, honeypot, 5 submissions / hour / IP, strict server-side
// validation, idempotent on client submission_id, duplicate guard (same contact
// within 10 min returns the existing reference). Service key never leaves server.
// Loyalty points are NOT awarded here (server awards at conversion by MOP map).
import { cors, logOrderEvent } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = () => ({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' });

export const MOPS = ['STRAIGHT PAYMENT', 'COD', 'COP', 'LAY AWAY', 'WALK-IN', 'PRE-ORDER'];
// Fixed loyalty map — used at CONVERSION, never trusted from the client.
export const MOP_POINTS = { 'STRAIGHT PAYMENT': 100, COD: 50, COP: 50, 'LAY AWAY': 25, 'WALK-IN': 75, 'PRE-ORDER': 0 };
export const PRIVACY_POLICY_VERSION = '2026-11-24.1';
export const PREORDER_POLICY_VERSION = '2026-11-24.1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PH_MOBILE_RE = /^(09\d{9}|\+?639\d{9})$/;

// 5 submissions / hour / IP (in-memory per instance — same pattern as other endpoints)
const WINDOW_MS = 60 * 60 * 1000, MAX_SUBMITS = 5;
const hits = (globalThis.__sbOrderFormRL ||= new Map());
function allow(ip) {
  const now = Date.now();
  let e = hits.get(ip);
  if (!e || now > e.reset) { e = { count: 0, reset: now + WINDOW_MS }; hits.set(ip, e); }
  e.count += 1;
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  return e.count <= MAX_SUBMITS;
}

export function validate(b) {
  const errs = {};
  const s = (x) => String(x ?? '').trim();
  const out = {
    email: s(b.email).toLowerCase(), fb_ig_name: s(b.fbIgName), vip_id: s(b.vipId) || null,
    receiver_name: s(b.receiverName), contact_number: s(b.contactNumber).replace(/[\s-]/g, ''),
    region: s(b.region), city: s(b.city), address: s(b.address),
    special_request: s(b.specialRequest) || null,
    payment_method: s(b.paymentMethod).toUpperCase(),
  };
  if (!EMAIL_RE.test(out.email) || out.email.length > 160) errs.email = 'Valid email is required';
  if (!out.fb_ig_name || out.fb_ig_name.length > 120) errs.fbIgName = 'Facebook / IG name is required';
  if (out.vip_id && out.vip_id.length > 40) errs.vipId = 'VIP ID too long';
  if (!out.receiver_name || out.receiver_name.length > 120) errs.receiverName = 'Receiver full name is required';
  if (!PH_MOBILE_RE.test(out.contact_number)) errs.contactNumber = 'Valid PH mobile number required (09XXXXXXXXX)';
  if (!out.region || out.region.length > 80) errs.region = 'Region is required';
  if (!out.city || out.city.length > 80) errs.city = 'City / Municipality is required';
  if (!out.address || out.address.length < 10 || out.address.length > 500) errs.address = 'Complete delivery address is required';
  if (out.special_request && out.special_request.length > 500) errs.specialRequest = 'Notes too long';
  if (!MOPS.includes(out.payment_method)) errs.paymentMethod = 'Choose a payment method';
  if (b.privacyAccepted !== true) errs.privacyAccepted = 'Privacy Policy & Terms acceptance is required';
  if (out.payment_method === 'PRE-ORDER' && b.preorderAccepted !== true) errs.preorderAccepted = 'PRE-ORDER policy acceptance is required';
  return { out, errs };
}

// Create the matching FB Form order for a submission and link the request to
// it. Best-effort: a failure leaves the request saved for manual recovery.
async function createFormOrder(out, requestRef) {
  const shipping_address = [out.address, out.city, out.region].filter(Boolean).join(', ');
  for (let i = 0; i < 3; i++) {
    const order_number = `SB-${String(Math.floor(1e9 + Math.random() * 9e9))}`;
    try {
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders`, {
        method: 'POST', headers: { ...H(), Prefer: 'return=representation' },
        body: JSON.stringify({
          order_number,
          customer_name: out.receiver_name, facebook_name: out.fb_ig_name || null,
          customer_email: out.email || null, contact_number: out.contact_number,
          shipping_address, region: out.region || null, city: out.city || null,
          notes: out.special_request || null,
          items: [], subtotal: 0, shipping_fee: 0, discount_amount: 0, total: 0,
          payment_method: out.payment_method, status: 'pending',
          payment_status: out.payment_method === 'PRE-ORDER' ? 'awaiting_full_payment' : 'pending',
          source: 'sheet_import',
        }),
      });
      if (ins.ok) {
        const order = (await ins.json())[0];
        await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}`, {
          method: 'PATCH', headers: H(),
          body: JSON.stringify({ status: 'converted', converted_order_number: order.order_number }),
        }).catch(() => {});
        await logOrderEvent({ order_number: order.order_number, actor: 'customer', action: 'create',
          new_value: { source: 'order_form', request_ref: requestRef, payment_method: out.payment_method, total: 0 } });
        return order;
      }
      const txt = await ins.text();
      if (!/duplicate key|23505/.test(txt)) return null;
    } catch { return null; }
  }
  return null;
}

const rqRef = () => {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // PHT date for the ref
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `RQ-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
};

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b) return res.status(400).json({ error: 'bad request' });
  if (b.website) return res.status(200).json({ ok: true, ref: 'RQ-OK' }); // honeypot: pretend success

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!allow(ip)) return res.status(429).json({ error: 'Too many submissions — please try again later.' });

  const { out, errs } = validate(b);
  if (Object.keys(errs).length) return res.status(422).json({ error: 'validation', fields: errs });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'server not configured' });

  const submissionId = typeof b.submissionId === 'string' ? b.submissionId.slice(0, 64) : null;
  try {
    // Idempotency: same client submission_id → return the same reference.
    if (submissionId) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?submission_id=eq.${encodeURIComponent(submissionId)}&select=request_ref`, { headers: H() });
      const rows = r.ok ? await r.json() : [];
      if (rows[0]) return res.status(200).json({ ok: true, ref: rows[0].request_ref, duplicate: true });
    }
    // Duplicate guard: same contact + same MOP in the last 10 minutes.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const d = await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?contact_number=eq.${encodeURIComponent(out.contact_number)}&payment_method=eq.${encodeURIComponent(out.payment_method)}&created_at=gte.${since}&select=request_ref&limit=1`, { headers: H() });
    const dup = d.ok ? await d.json() : [];
    if (dup[0]) return res.status(200).json({ ok: true, ref: dup[0].request_ref, duplicate: true });

    const row = {
      ...out,
      submission_id: submissionId,
      privacy_policy_version: PRIVACY_POLICY_VERSION,
      privacy_accepted_at: new Date().toISOString(),
      preorder_policy_version: out.payment_method === 'PRE-ORDER' ? PREORDER_POLICY_VERSION : null,
      preorder_accepted_at: out.payment_method === 'PRE-ORDER' ? new Date().toISOString() : null,
      source: 'order_form',
      utm: b.utm && typeof b.utm === 'object' ? b.utm : null,
    };
    // Collision-resistant reference: retry on unique violation (up to 5x).
    for (let i = 0; i < 5; i++) {
      const ref = rqRef();
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests`, {
        method: 'POST', headers: { ...H(), Prefer: 'return=representation' },
        body: JSON.stringify({ ...row, request_ref: ref }),
      });
      if (ins.ok) {
        const saved = (await ins.json())[0];
        // UNIFORM FLOW (Pia, Nov 25): the new link IS the FB order form.
        // A submission immediately becomes a normal FB Form order (₱0 until
        // the admin encodes items — exactly like sheet-imported form orders).
        // source 'sheet_import' keeps every downstream behavior identical
        // (badges, stats, stock-trigger exemption, edit → invoice flow);
        // the import's refresh pass matches by sheet order numbers only, so
        // it can never touch these. No stock, no loyalty, no GAS here.
        const order = await createFormOrder(out, saved.request_ref);
        return res.status(200).json({ ok: true, ref: saved.request_ref, order_number: order ? order.order_number : null });
      }
      const txt = await ins.text();
      if (!/duplicate key|23505/.test(txt) || /submission_id/.test(txt)) {
        if (/submission_id/.test(txt) && submissionId) {
          const r2 = await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?submission_id=eq.${encodeURIComponent(submissionId)}&select=request_ref`, { headers: H() });
          const rows2 = r2.ok ? await r2.json() : [];
          if (rows2[0]) return res.status(200).json({ ok: true, ref: rows2[0].request_ref, duplicate: true });
        }
        if (!/duplicate key|23505/.test(txt)) return res.status(502).json({ error: 'could not save — please try again' });
      }
    }
    return res.status(502).json({ error: 'could not save — please try again' });
  } catch {
    return res.status(500).json({ error: 'could not save — please try again' });
  }
}
