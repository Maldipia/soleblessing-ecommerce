// Admin-only: trigger NSB SYSTEM's invoice generation for one order, remotely.
// Finds the order's row in the ORDER sheet (any payment tab) via the GAS webhook,
// runs createInvoiceForRow, and saves the resulting invoice URL on sb_orders.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GAS_HOOK = process.env.GAS_ORDER_WEBHOOK || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY || !ADMIN_PASSWORD) return res.status(500).json({ error: 'server not configured' });
  if (!GAS_HOOK) return res.status(500).json({ error: 'GAS_ORDER_WEBHOOK not set' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, order_number } = body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
  if (!order_number) return res.status(400).json({ error: 'order_number required' });

  try {
    const r = await fetch(GAS_HOOK, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'generate_invoice', orderId: order_number }),
    });
    const text = await r.text();
    let out; try { out = JSON.parse(text); } catch { out = { success: false, message: 'GAS returned non-JSON — redeploy the webhook with a New version after pasting the router' }; }
    if (!out.success) return res.status(422).json({ error: out.message || 'invoice generation failed' });

    await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order_number)}`, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_url: out.invoiceUrl, updated_at: new Date().toISOString() }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, invoice_url: out.invoiceUrl, invoice_name: out.invoiceName });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
