// Admin-only: email an order's invoice to the customer via NSB SYSTEM's own
// branded Gmail sender (sendInvoiceEmail). Marks invoice_sent_at on sb_orders
// so the dashboard shows the green "Sent" state. Sheet column P also gets SENT.
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
  let authed = password === ADMIN_PASSWORD;
  // Manager PIN (sb_settings.staff_admins entry with role:'manager') may also
  // process orders: generate/send invoices and parse shipping receipts.
  if (!authed && password) {
    try {
      const sres = await fetch(`${SUPABASE_URL}/rest/v1/sb_settings?key=eq.staff_admins&select=value`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const [row] = sres.ok ? await sres.json() : [];
      const list = row ? JSON.parse(row.value || '[]') : [];
      authed = !!list.find(s => s && s.active !== false && s.role === 'manager' && String(s.pin) === String(password));
    } catch {}
  }
  if (!authed) return res.status(401).json({ error: 'unauthorized' });
  if (!order_number) return res.status(400).json({ error: 'order_number required' });

  try {
    const r = await fetch(GAS_HOOK, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'send_invoice', orderId: order_number }),
    });
    const text = await r.text();
    let out; try { out = JSON.parse(text); } catch { out = { success: false, message: 'GAS returned non-JSON' }; }
    if (!out.success) return res.status(422).json({ error: out.message || out.error || 'send failed' });

    const sentAt = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(order_number)}`, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_sent_at: sentAt, updated_at: sentAt }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, email: out.email, sent_at: sentAt });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
