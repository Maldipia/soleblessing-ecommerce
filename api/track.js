// Visitor analytics ingest — anonymous, batched, rate-limited.
// Accepts sendBeacon batches from the storefront and hands them to the
// sb_track_ingest() SQL function (service role; tables are RLS-locked).
//
// Privacy: no cookies read, no PII accepted, raw IP never stored (only used
// in-memory for rate limiting), country comes from Vercel's edge header.
// 'purchase' is NOT accepted here — it is recorded server-side in place-order.
import { cors } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const CLIENT_EVENTS = new Set([
  'page_view', 'search', 'category_view', 'size_filter', 'brand_filter',
  'add_to_cart', 'remove_from_cart', 'begin_checkout', 'checkout_error', 'track_order_view',
]);

// per-IP rate limit: 240 events / 10 min (in-memory per instance — same pattern as track-order)
const WINDOW_MS = 10 * 60 * 1000, MAX_EVENTS = 240;
const hits = (globalThis.__sbTrackIngestRL ||= new Map());
function allow(ip, n) {
  const now = Date.now();
  let e = hits.get(ip);
  if (!e) { e = { count: 0, reset: now + WINDOW_MS }; hits.set(ip, e); }
  if (now > e.reset) { e.count = 0; e.reset = now + WINDOW_MS; }
  e.count += n;
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  return e.count <= MAX_EVENTS;
}

const deviceOf = (ua = '') =>
  /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop';

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!SERVICE_KEY) return res.status(200).json({ ok: false }); // never surface errors to shoppers

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body.v !== 'string' || typeof body.s !== 'string') return res.status(200).json({ ok: false });

  const events = (Array.isArray(body.e) ? body.e : []).slice(0, 25)
    .filter(ev => ev && CLIENT_EVENTS.has(ev.t));
  if (!events.length) return res.status(200).json({ ok: true });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!allow(ip, events.length)) return res.status(200).json({ ok: true }); // silently drop

  const payload = {
    v: String(body.v).slice(0, 64),
    s: String(body.s).slice(0, 64),
    device: deviceOf(String(req.headers['user-agent'] || '')),
    country: String(req.headers['x-vercel-ip-country'] || '').slice(0, 2),
    meta: body.m && typeof body.m === 'object' ? {
      landing: String(body.m.landing || '').slice(0, 300),
      ref: String(body.m.ref || '').slice(0, 300),
      utm_source: String(body.m.utm_source || '').slice(0, 100),
      utm_medium: String(body.m.utm_medium || '').slice(0, 100),
      utm_campaign: String(body.m.utm_campaign || '').slice(0, 100),
      source: String(body.m.source || '').slice(0, 40),
    } : {},
    events: events.map(ev => ({
      t: ev.t,
      p: typeof ev.p === 'string' ? ev.p.slice(0, 300) : undefined,
      ic: typeof ev.ic === 'string' ? ev.ic.slice(0, 40) : undefined,
      sku: typeof ev.sku === 'string' ? ev.sku.slice(0, 60) : undefined,
      d: ev.d && typeof ev.d === 'object' ? ev.d : undefined,
    })),
  };

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/sb_track_ingest`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
  } catch {}
  return res.status(200).json({ ok: true });
}
