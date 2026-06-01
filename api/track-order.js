// Public order tracking — looks up a single order by order_number using the
// service role server-side, so the anon key no longer needs read access to orders.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const orderNumber = (req.query && req.query.order_number) || '';
  if (!orderNumber) return res.status(400).json({ error: 'order_number required' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });
  const url = `${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNumber)}&limit=1`;
  try {
    const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    const rows = await r.json().catch(() => []);
    return res.status(200).json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
