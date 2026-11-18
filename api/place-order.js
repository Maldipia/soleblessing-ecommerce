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
              fbName: order.facebook_name || (order.source === 'manual' ? 'DASHBOARD' : 'WEBSITE'),
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

      // Website orders get their invoice AUTO-generated (FB-form orders stay
      // admin-triggered). Capped so a slow GAS run never breaks checkout — if
      // it misses, the admin "Generate invoice" button is the fallback.
      try {
        const g = await fetch(GAS_HOOK, {
          method: 'POST', redirect: 'follow',
          signal: AbortSignal.timeout(25000),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'generate_invoice', orderId: order.order_number }),
        });
        const out = JSON.parse(await g.text());
        if (out && out.success && out.invoiceUrl) {
          await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order.order_number)}`, {
            method: 'PATCH', headers: H,
            body: JSON.stringify({ invoice_url: out.invoiceUrl, updated_at: new Date().toISOString() }),
          }).catch(() => {});
          order.invoice_url = out.invoiceUrl;
        }
      } catch (e) { /* non-fatal — admin button covers it */ }

      // Nike/Adidas-style "order received" email with photos, right away.
      // Non-fatal; sb_email_log keeps the record either way.
      if (order.customer_email) {
        try {
          const host = req.headers['x-forwarded-host'] || req.headers.host;
          await fetch(`https://${host}/api/send-order-email`, {
            method: 'POST', signal: AbortSignal.timeout(30000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: process.env.ADMIN_PASSWORD, order_number: order.order_number, type: 'order_received' }),
          });
        } catch (e) { /* non-fatal */ }
      }
    }
    return res.status(200).json({ order });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
