// Public checkout endpoint — atomic order placement via Postgres RPC:
// stock decrement + order insert + promo usage + loyalty points in ONE transaction.
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
  delete orderData.id;

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sb_place_order`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ order_data: orderData, promo: promo || null }),
    });
    const text = await r.text();
    if (!r.ok) {
      const m = text.match(/OUT_OF_STOCK:([^"\\]+)/);
      if (m) return res.status(409).json({ error: 'out_of_stock', item_code: m[1] });
      return res.status(r.status).json({ error: text });
    }
    const order = JSON.parse(text || 'null');

    // Mirror website orders into the Google ORDER sheet so the existing GAS
    // invoice system covers them too. Fire-and-forget; GAS webhook URL set in env.
    const GAS_HOOK = process.env.GAS_ORDER_WEBHOOK || '';
    if (GAS_HOOK && order) {
      // Speak processOrder's native format. One POST per line item (the sheet is
      // one item per row); orderId passthrough keeps the website SB-number.
      const pmMap = { cod: 'COD', gcash: 'STRAIGHT PAYMENT', maya: 'STRAIGHT PAYMENT', bdo: 'STRAIGHT PAYMENT', bpi: 'STRAIGHT PAYMENT', bank: 'STRAIGHT PAYMENT' };
      const pm = pmMap[(order.payment_method || '').toLowerCase()] || 'COD';
      const items = (order.items && order.items.length ? order.items : [{}]);
      for (const it of items) {
        try {
          await fetch(GAS_HOOK, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              orderId: order.order_number,
              email: order.customer_email || '',
              fbName: 'WEBSITE',
              receiverName: order.customer_name || '',
              address: order.shipping_address || '',
              contact: order.contact_number || '',
              paymentMethod: pm,
              specialRequest: order.notes || '',
              region: order.region || '',
              city: order.city || '',
              itemCode: it.id || '',
              productName: [it.name, it.size && `(${it.size})`].filter(Boolean).join(' '),
              price: it.price ? (it.price / 100) : '',
            }),
          });
        } catch (e) { /* non-fatal */ }
      }
    }
    return res.status(200).json({ order });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
