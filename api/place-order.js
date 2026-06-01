// Public checkout endpoint — creates an order (and records promo usage) using the
// service role server-side, so the public anon key never needs write access to orders.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY)            return res.status(500).json({ error: 'service key missing' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { orderData, promo } = body || {};
  if (!orderData || !orderData.order_number || !orderData.customer_name)
    return res.status(400).json({ error: 'invalid order' });

  try {
    const clean = { ...orderData, status: 'pending' };
    delete clean.id; // never trust a client-supplied id
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders`, {
      method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(clean),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });
    const order = (JSON.parse(text || '[]'))[0] || null;

    if (promo && order && order.id) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/sb_promo_uses`, {
          method: 'POST', headers: H,
          body: JSON.stringify({
            promo_id: promo.id, order_id: order.id, order_number: promo.orderNumber,
            customer_name: promo.customerName, discount_applied: promo.discount,
          }),
        });
        await fetch(`${SUPABASE_URL}/rest/v1/sb_promos?id=eq.${promo.id}`, {
          method: 'PATCH', headers: H,
          body: JSON.stringify({ uses_count: (promo.uses_count || 0) + 1, updated_at: new Date().toISOString() }),
        });
      } catch (e) { /* non-fatal */ }
    }
    return res.status(200).json({ order });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
