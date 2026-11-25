// Admin-gated: OCR a shipping receipt via NSB SYSTEM (Drive OCR), then match
// the receiver against open orders. Returns parsed fields + ranked candidates.
import { verifyCredential, isOwnerOrManager, cors } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GAS_HOOK = process.env.GAS_ORDER_WEBHOOK || '';

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };

// Pick the REAL tracking number from the receipt's raw OCR text, server-side.
// LBC receipts carry many long numbers (MIN, Serial, Invoice No., TIN, phones)
// — the tracking number is the 12-digit one printed alone under the barcode.
// Lines labeled as fiscal/contact fields are blacklisted; a number standing
// alone on its own line (the barcode line) is boosted. Falls back to the
// OCR service's own guess when nothing scores positive.
export function pickTracking(raw, courier, fallback) {
  const lines = String(raw || '').split(/\r?\n/);
  const badLabel = /(MIN|SERIAL|INVOICE|TIN|VAT|TEL|PTU|ACCREDIT|SERIES|CONTACT|REG)/i;
  const phoneLike = (d) => /^(0?9\d{9,10}|63\d{10,11})$/.test(d);
  const cands = [];
  for (const ln of lines) {
    for (const m of ln.matchAll(/\d[\d\- ]{8,22}\d/g)) {
      const digits = m[0].replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 18) continue;
      if (phoneLike(digits)) continue;
      cands.push({ digits, ln });
    }
  }
  const isLbc = /lbc/i.test(String(courier || '')) || /LBC/i.test(String(raw || ''));
  const score = (c) =>
    (/TRACK/i.test(c.ln) ? 100 : 0) +
    (badLabel.test(c.ln) ? -100 : 0) +
    (isLbc && c.digits.length === 12 ? 50 : 0) +
    (c.digits.length >= 11 && c.digits.length <= 14 ? 10 : 0) +
    (/^[\s\d\- ]+$/.test(c.ln) ? 20 : 0); // number alone on its line = barcode line
  cands.sort((a, b) => score(b) - score(a));
  const best = cands.length && score(cands[0]) > 0 ? cands[0] : null;
  return best ? best.digits : String(fallback || '');
}

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY || !ADMIN_PASSWORD || !GAS_HOOK) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, fileBase64, mimeType = 'image/jpeg' } = body || {};
  const cred = await verifyCredential({ password, token: body && body.token });
  if (!isOwnerOrManager(cred)) return res.status(401).json({ error: 'unauthorized' });
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
      tracking: pickTracking(ocr.rawText, ocr.courier, ocr.tracking),
      receipt_url: ocr.fileUrl || '',
      match: scored.length && scored[0].score >= 75 ? scored[0] : null,
      candidates: scored,
      text_found: (ocr.rawText || '').length > 20,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
