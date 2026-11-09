// Shoebox label OCR via NSB SYSTEM's Google OCR (far stronger than browser
// OCR on warehouse photos). Auth: owner password OR an active staff PIN.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GAS_HOOK = process.env.GAS_ORDER_WEBHOOK || '';

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: '8mb' } } };

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
  const { password, base64, mimeType = 'image/jpeg' } = body || {};
  if (!base64) return res.status(400).json({ error: 'missing image' });

  let authed = password === ADMIN_PASSWORD;
  if (!authed && password) {
    try {
      const sres = await fetch(`${SUPABASE_URL}/rest/v1/sb_settings?key=eq.staff_admins&select=value`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const [row] = sres.ok ? await sres.json() : [];
      const list = row ? JSON.parse(row.value || '[]') : [];
      authed = !!list.find(s => s && s.active !== false && String(s.pin) === String(password));
    } catch {}
  }
  if (!authed) return res.status(401).json({ error: 'unauthorized' });

  try {
    const r = await fetch(GAS_HOOK, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ocr_label', fileBase64: base64, mimeType }),
    });
    const text = await r.text();
    let out; try { out = JSON.parse(text); } catch { out = { success: false, error: 'GAS returned non-JSON' }; }
    if (!out.success) return res.status(422).json({ error: out.error || 'OCR failed' });
    return res.status(200).json({ ok: true, text: out.text || '' });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
