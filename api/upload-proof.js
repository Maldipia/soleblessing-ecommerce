// Public payment-proof upload. Validates the order exists, stores the file in the
// payment-proofs bucket, links it on the order, marks payment_status=submitted.
import { cors, logOrderEvent } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { orderId = '', customerName = '', paymentMethod = '', referenceNumber = '', message = '', amount = '', fileBase64, mimeType = 'image/jpeg' } = body || {};

  const orderNo = String(orderId).trim().toUpperCase();
  if (!/^SB-[A-Z0-9-]{4,24}$/.test(orderNo)) return res.status(400).json({ error: 'invalid order id' });
  if (!fileBase64) return res.status(400).json({ error: 'missing file' });
  if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(mimeType)) return res.status(400).json({ error: 'jpeg/png/webp/pdf only' });

  try {
    const find = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNo)}&select=id,payment_status,updated_at`, { headers: H });
    const rows = find.ok ? await find.json() : [];
    if (!rows.length) return res.status(404).json({ error: 'order not found — check your order number' });
    const existing = rows[0];

    // Verified payments are final — uploading again can never touch them,
    // and the admin's verification can never be silently superseded.
    if (existing.payment_status === 'verified')
      return res.status(409).json({ error: 'This payment is already verified — no new proof is needed.' });
    // Duplicate-submission guard: a double-tap / retry within 90s of a
    // submission is acknowledged without writing anything again.
    if (existing.payment_status === 'submitted' && existing.updated_at &&
        Date.now() - new Date(existing.updated_at).getTime() < 90 * 1000)
      return res.status(200).json({ ok: true, duplicate: true });

    const buf = Buffer.from(fileBase64, 'base64');
    if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'max 5MB' });
    const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${orderNo}/${Date.now()}.${ext}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/payment-proofs/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
      body: buf,
    });
    if (!up.ok) return res.status(502).json({ error: await up.text() });

    // PRIVATE storage: only the bucket PATH is stored — never a public URL.
    // Admins view it through a short-lived signed URL (admin op 'proof_url').
    const storedRef = `payment-proofs/${path}`;

    const note = [paymentMethod && `via ${paymentMethod}`, referenceNumber && `ref ${referenceNumber}`, customerName && `by ${customerName}`].filter(Boolean).join(' · ');
    const patch = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNo)}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ payment_proof_url: storedRef, payment_status: 'submitted', payment_reference: String(referenceNumber || '').slice(0, 80) || null, updated_at: new Date().toISOString() }),
    });
    if (!patch.ok) return res.status(502).json({ error: await patch.text() });

    // P1 audit trail: proof submission entry (no proof URL in the log payload).
    // The customer's optional message + claimed amount live here for the admin.
    logOrderEvent({ order_number: orderNo, actor: 'customer', action: 'payment_proof_submitted',
      new_value: { reference: String(referenceNumber || '').slice(0, 80) || null, method: paymentMethod || null,
        message: String(message || '').slice(0, 500) || null, amount_claimed: String(amount || '').slice(0, 40) || null } });

    return res.status(200).json({ ok: true, note });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
