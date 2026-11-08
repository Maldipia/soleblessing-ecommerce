// Public payment-proof upload. Validates the order exists, stores the file in the
// payment-proofs bucket, links it on the order, marks payment_status=submitted.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { orderId = '', customerName = '', paymentMethod = '', referenceNumber = '', fileBase64, mimeType = 'image/jpeg' } = body || {};

  const orderNo = String(orderId).trim().toUpperCase();
  if (!/^SB-[A-Z0-9-]{4,24}$/.test(orderNo)) return res.status(400).json({ error: 'invalid order id' });
  if (!fileBase64) return res.status(400).json({ error: 'missing file' });
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(mimeType)) return res.status(400).json({ error: 'jpeg/png/webp/pdf only' });

  try {
    const find = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNo)}&select=id,payment_reference`, { headers: H });
    const rows = find.ok ? await find.json() : [];
    if (!rows.length) return res.status(404).json({ error: 'order not found — check your order number' });

    const buf = Buffer.from(fileBase64, 'base64');
    if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'max 6MB' });
    const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${orderNo}/${Date.now()}.${ext}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/payment-proofs/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) return res.status(502).json({ error: await up.text() });
    const url = `${SUPABASE_URL}/storage/v1/object/public/payment-proofs/${path}`;

    const note = [paymentMethod && `via ${paymentMethod}`, referenceNumber && `ref ${referenceNumber}`, customerName && `by ${customerName}`].filter(Boolean).join(' · ');
    const patch = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNo)}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ payment_proof_url: url, payment_status: 'submitted', payment_reference: referenceNumber || null, updated_at: new Date().toISOString() }),
    });
    if (!patch.ok) return res.status(502).json({ error: await patch.text() });

    return res.status(200).json({ ok: true, url, note });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
