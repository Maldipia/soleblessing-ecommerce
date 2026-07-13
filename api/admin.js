// Privileged admin endpoint — uses the Supabase SERVICE ROLE key (bypasses RLS),
// gated by ADMIN_PASSWORD. The service key NEVER reaches the browser.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const ALLOWED = new Set([
  'sb_orders','sb_products','sb_promos','sb_settings','sb_reviews',
  'sb_promo_uses','sb_loyalty','sb_loyalty_transactions','sb_wishlist_log','sb_inventory',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY)            return res.status(500).json({ error: 'service key missing' });
  if (!ADMIN_PASSWORD)         return res.status(500).json({ error: 'admin password not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, op, table, query = '', data } = body || {};

  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
  if (op === 'auth') return res.status(200).json({ ok: true });
  if (!ALLOWED.has(table)) return res.status(400).json({ error: 'table not allowed' });

  const method = op === 'select' ? 'GET' : (op === 'insert' || op === 'upsert') ? 'POST'
               : op === 'update' ? 'PATCH' : op === 'delete' ? 'DELETE' : null;
  if (!method) return res.status(400).json({ error: 'bad op' });

  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? ('?' + query) : ''}`;
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: op === 'upsert' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
  };
  try {
    const r = await fetch(url, {
      method, headers,
      body: (op === 'insert' || op === 'upsert' || op === 'update') ? JSON.stringify(data) : undefined,
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });
    try { return res.status(200).json(JSON.parse(text || '[]')); }
    catch { return res.status(200).json([]); }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
