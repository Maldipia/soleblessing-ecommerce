// Public order tracking — looks up a single order by order_number using the
// service role server-side, so the anon key no longer needs read access to orders.
//
// P0.2 HARDENING (data minimization + abuse protection):
//  - Returns ONLY the fields the Track Order page and the /invoice page render.
//    Dropped from the public response: payment_proof_url, invoice_url,
//    shipping_receipt_url, notes, facebook_name, source, internal ids/timestamps.
//  - Items are sanitized: acquisition cost fields (cost, cost_source) that the
//    place-order RPC snapshots onto each line NEVER leave the server here.
//  - Per-IP rate limit (in-memory, per serverless instance): 30 lookups / 10 min,
//    then a 10-min cooldown — throttles order-number enumeration while staying
//    invisible to a customer checking their own order a handful of times.
import { cors } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Exactly what the Track Order page + /invoice page use — nothing more.
const PUBLIC_FIELDS = [
  'order_number', 'created_at', 'status',
  'customer_name', 'customer_email', 'contact_number', 'shipping_address',
  'items', 'subtotal', 'shipping_fee', 'discount_amount', 'total',
  'payment_method', 'payment_status', 'payment_reference', 'promo_code',
  'courier', 'tracking_reference',
];

// ── per-IP rate limit (per-instance; durable cross-instance limiting would
// need shared storage — documented limitation, acceptable for a public read) ──
const WINDOW_MS = 10 * 60 * 1000, MAX_HITS = 30, LOCK_MS = 10 * 60 * 1000;
const hits = (globalThis.__sbTrackRL ||= new Map());
function limited(ip) {
  const now = Date.now();
  let e = hits.get(ip);
  if (!e) { e = { times: [], lockUntil: 0 }; hits.set(ip, e); }
  if (e.lockUntil > now) return Math.ceil((e.lockUntil - now) / 1000);
  e.times = e.times.filter(t => now - t < WINDOW_MS);
  e.times.push(now);
  if (e.times.length > MAX_HITS) { e.lockUntil = now + LOCK_MS; return Math.ceil(LOCK_MS / 1000); }
  if (hits.size > 5000) { // keep the map bounded
    for (const [k, v] of hits) if (v.lockUntil < now && (!v.times.length || now - v.times[v.times.length - 1] > WINDOW_MS)) hits.delete(k);
  }
  return 0;
}
const ipOf = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const retry = limited(ipOf(req));
  if (retry) {
    res.setHeader('Retry-After', String(retry));
    return res.status(429).json({ error: 'too many lookups — please try again in a few minutes' });
  }
  let orderNumber = (req.query && req.query.order_number) || '';
  const token = (req.query && req.query.token) || '';
  if (!orderNumber && !token) return res.status(400).json({ error: 'order_number required' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });

  // ── secure invoice link: resolve token → order (7-day customer access).
  // Expired / revoked / unknown → 410: customer access is gone, the records
  // are NOT (admin keeps the permanent copy in the dashboard).
  let tokenMeta = null;
  if (token) {
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(token))) return res.status(410).json({ error: 'link_expired' });
    const tr = await fetch(
      `${SUPABASE_URL}/rest/v1/sb_invoice_tokens?token=eq.${encodeURIComponent(token)}&select=order_number,expires_at,revoked_at&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const [t] = tr.ok ? await tr.json().catch(() => []) : [];
    if (!t || t.revoked_at || new Date(t.expires_at).getTime() < Date.now())
      return res.status(410).json({ error: 'link_expired' });
    orderNumber = t.order_number;
    tokenMeta = { expires_at: t.expires_at };
  }
  const url = `${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNumber)}` +
    `&select=${PUBLIC_FIELDS.join(',')}&limit=1`;
  try {
    const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    const rows = await r.json().catch(() => []);
    if (!Array.isArray(rows)) return res.status(200).json([]);
    // strip acquisition-cost fields from each item line
    for (const o of rows) {
      if (Array.isArray(o.items)) {
        o.items = o.items.map((it) => {
          const { cost, cost_source, ...pub } = it || {};
          return pub;
        });
      }
      // Admin asked for a NEW payment proof → surface the reason to the
      // customer (latest proof_reupload_requested audit entry; reason only).
      if (tokenMeta) o.invoice_access = tokenMeta; // show the customer their link validity
      if (o.payment_status === 'reupload') {
        try {
          const lr = await fetch(
            `${SUPABASE_URL}/rest/v1/sb_order_log?order_number=eq.${encodeURIComponent(o.order_number)}&action=eq.proof_reupload_requested&order=created_at.desc&limit=1&select=new_value,created_at`,
            { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
          );
          const [entry] = lr.ok ? await lr.json() : [];
          if (entry) { o.reupload_reason = (entry.new_value && entry.new_value.reason) || null; o.reupload_requested_at = entry.created_at; }
        } catch { /* best-effort */ }
      }
    }
    return res.status(200).json(rows);
  } catch (e) {
    return res.status(500).json({ error: 'lookup failed' });
  }
}
