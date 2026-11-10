// Admin-gated: OCR a shipping receipt via NSB SYSTEM (Drive OCR), then match
// the receiver against open orders. Returns parsed fields + ranked candidates.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GAS_HOOK = process.env.GAS_ORDER_WEBHOOK || '';

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY || !ADMIN_PASSWORD || !GAS_HOOK) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, fileBase64, mimeType = 'image/jpeg' } = body || {};
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
  if (!fileBase64) return res.status(400).json({ error: 'missing file' });
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) return res.status(400).json({ error: 'jpeg/png/webp only' });

  try {
    const r = await fetch(GAS_HOOK, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'parse_shipping_receipt', fileBase64, mimeType }),
    });
    const text = await r.text();
    let ocr; try { ocr = JSON.parse(text); } catch { ocr = { success: false, message: 'OCR service returned non-JSON' }; }
    if (!ocr.success) return res.status(422).json({ error: ocr.message || 'OCR failed' });

    // Match receiver against open orders (no tracking yet, not cancelled/delivered)
    const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    const or = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?select=order_number,customer_name,contact_number,total,status,created_at&status=not.in.(cancelled,delivered)&tracking_reference=is.null&order=created_at.desc&limit=300`, { headers: H });
    const orders = or.ok ? await or.json() : [];

    const hay = String(ocr.rawText || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
    const scored = orders.map(o => {
      const tokens = String(o.customer_name || '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(t => t.length > 1);
      const hit = tokens.filter(t => hay.includes(t)).length;
      let score = tokens.length ? hit / tokens.length : 0;
      const phone = String(o.contact_number || '').replace(/\D/g, '');
      if (phone.length >= 9 && hay.replace(/ /g, '').includes(phone.slice(-9))) score = Math.max(score, 0.95);
      return { order_number: o.order_number, customer_name: o.customer_name, total: o.total, status: o.status, score: Math.round(score * 100) };
    }).filter(c => c.score >= 40).sort((a, b) => b.score - a.score).slice(0, 3);

    return res.status(200).json({
      ok: true,
      courier: ocr.courier || '',
      tracking: ocr.tracking || '',
      receipt_url: ocr.fileUrl || '',
      match: scored.length && scored[0].score >= 75 ? scored[0] : null,
      candidates: scored,
      text_found: (ocr.rawText || '').length > 20,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
