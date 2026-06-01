// Public loyalty endpoint — service-role backed so the anon key never touches the
// sb_loyalty / sb_loyalty_transactions tables (which hold customer PII).
// Actions: { action:'lookup', phone } and { action:'join', name, phone, email }.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

// Only expose fields the UI needs — never return email to the browser.
function publicMember(m) {
  if (!m) return null;
  return {
    id: m.id, customer_name: m.customer_name, contact_number: m.contact_number,
    points: m.points, tier: m.tier, total_spent: m.total_spent,
  };
}
const cleanPhone = (s) => String(s || '').trim().replace(/\s/g, '');

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
  const { action } = body || {};

  try {
    if (action === 'lookup') {
      const phone = cleanPhone(body.phone);
      if (!phone) return res.status(400).json({ error: 'phone required' });
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_loyalty?contact_number=eq.${encodeURIComponent(phone)}&limit=1`, { headers: H });
      const rows = await r.json().catch(() => []);
      const member = Array.isArray(rows) && rows[0] ? rows[0] : null;
      if (!member) return res.status(200).json({ member: null, transactions: [] });
      const tr = await fetch(`${SUPABASE_URL}/rest/v1/sb_loyalty_transactions?loyalty_id=eq.${member.id}&order=created_at.desc&limit=20`, { headers: H });
      const txns = await tr.json().catch(() => []);
      return res.status(200).json({ member: publicMember(member), transactions: Array.isArray(txns) ? txns : [] });
    }

    if (action === 'join') {
      const name = String(body.name || '').trim();
      const phone = cleanPhone(body.phone);
      const email = String(body.email || '').trim() || null;
      if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
      // already registered?
      const ex = await fetch(`${SUPABASE_URL}/rest/v1/sb_loyalty?contact_number=eq.${encodeURIComponent(phone)}&limit=1`, { headers: H });
      const exRows = await ex.json().catch(() => []);
      if (Array.isArray(exRows) && exRows.length > 0) return res.status(409).json({ error: 'already registered' });
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_loyalty`, {
        method: 'POST', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ customer_name: name, contact_number: phone, email, points: 0, tier: 'bronze', total_spent: 0 }),
      });
      const text = await ins.text();
      if (!ins.ok) return res.status(ins.status).json({ error: text });
      const member = (JSON.parse(text || '[]'))[0] || null;
      return res.status(200).json({ member: publicMember(member) });
    }

    return res.status(400).json({ error: 'bad action' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
