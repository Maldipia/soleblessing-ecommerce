// P2: product reviews — the open anon INSERT policy on sb_reviews is dropped;
// reviews now come through here with validation + a per-IP rate limit, written
// with the service key. Display (anon SELECT) is unchanged.
import { cors } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const WINDOW_MS = 60 * 60 * 1000, MAX_REVIEWS = 5;
const hits = (globalThis.__sbReviewRL ||= new Map());
const ipOf = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';
function limited(ip) {
  const now = Date.now();
  let e = hits.get(ip);
  if (!e) { e = []; hits.set(ip, e); }
  while (e.length && now - e[0] > WINDOW_MS) e.shift();
  if (e.length >= MAX_REVIEWS) return true;
  e.push(now);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
  return false;
}
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });
  if (limited(ipOf(req))) return res.status(429).json({ error: 'too many reviews — try again later' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const rating = parseInt(body?.rating, 10);
  const row = {
    sku: clean(body?.sku, 30),
    item_code: clean(body?.item_code, 20) || null,
    customer_name: clean(body?.customer_name, 60),
    rating,
    comment: clean(body?.comment, 600),
    size_purchased: clean(body?.size_purchased, 12) || null,
    status: 'published',
  };
  if (!row.sku) return res.status(400).json({ error: 'sku required' });
  if (!row.customer_name) return res.status(400).json({ error: 'name required' });
  if (!row.comment) return res.status(400).json({ error: 'review text required' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1–5' });

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_reviews`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'submit failed' });
  }
}
