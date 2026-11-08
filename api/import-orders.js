// One-shot/re-runnable: import historical orders from the SB ORDER Sheet into sb_orders.
// Insert-only (ON CONFLICT order_number DO NOTHING) — DB rows always win. Plain INSERTs
// never touch stock (the stock trigger fires on status UPDATE only). 10-min cooldown.
const SHEET_ID = '13eM-zpN--AVOwN4uFUSVeQX0e6YA922VzgjOomhfk-Y';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const PLACEHOLDERS = new Set(['NOT YET','NOT SENT','N/A','NA','-','TBD','PENDING']);
const clean = v => { const t = String(v || '').trim(); return PLACEHOLDERS.has(t.toUpperCase()) ? '' : t; };
const peso = v => { const n = parseFloat(String(v || '').replace(/[₱,\s]/g, '')); return isNaN(n) ? 0 : Math.round(n * 100); };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'POST or GET' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });

  try {
    const logRes = await fetch(`${SUPABASE_URL}/rest/v1/sync_log?sync_type=eq.order_import&order=created_at.desc&limit=1&select=created_at`, { headers: H });
    if (logRes.ok) {
      const [last] = await logRes.json();
      if (last && Date.now() - new Date(last.created_at).getTime() < 10 * 60 * 1000)
        return res.status(429).json({ error: 'ran recently — wait a few minutes' });
    }

    // Payment tabs by gid (export?gid works reliably server-side; gviz does not)
    const TABS = [
      { name: 'STRAIGHT PAYMENT', gid: '0' },
      { name: 'COD', gid: '212574803' },
      { name: 'COP', gid: '868762773' },
      { name: 'LAY AWAY', gid: '550187666' },
      { name: 'WALK-IN', gid: '829108774' },
      { name: 'WALK IN', gid: '346150009' },
    ];
    const texts = await Promise.all(TABS.map(t =>
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${t.gid}`)
        .then(r => r.ok ? r.text() : '').catch(() => '')));
    if (!texts.some(Boolean)) return res.status(502).json({ error: 'order sheet fetch failed' });

    const tabCounts = {};
    const rows = texts.flatMap((t, i) => {
      const rs = t ? parseCSV(t).slice(1) : [];
      tabCounts[TABS[i].name] = rs.length;
      return rs;
    });
    const orders = new Map(); let last = null;
    for (const r of rows) {
      const oid = (r[2] || '').trim();
      const item = (r[26] || '').trim();
      if (oid) {
        if (!orders.has(oid)) orders.set(oid, {
          ts: (r[0] || '').trim(), email: (r[1] || '').trim(), fb: (r[3] || '').trim(),
          name: (r[4] || '').trim() || (r[3] || '').trim(), addr: (r[5] || '').trim(),
          contact: (r[6] || '').trim(), pm: (r[7] || '').trim(), req: (r[8] || '').trim(),
          region: (r[9] || '').trim(), city: (r[10] || '').trim(), pay: (r[13] || '').trim().toLowerCase(),
          invoice: (r[14] || '').trim(), courier: clean(r[16]), track: clean(r[17]),
          notes: (r[19] || '').trim(), items: [],
        });
        last = orders.get(oid);
      }
      if (item && last) last.items.push({ id: item, name: (r[27] || '').trim(), sku: (r[28] || '').trim(), size: (r[29] || '').trim(), price: peso(r[31]), qty: 1, brand: '', imageUrl: '' });
    }

    const payload = [];
    for (const [oid, o] of orders) {
      if (!o.name && !o.items.length) continue;
      const total = o.items.reduce((s, i) => s + i.price, 0);
      let status = 'pending';
      if (o.courier && o.track) status = 'delivered'; else if (o.pay === 'paid') status = 'paid';
      let created = null;
      const m = o.ts.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
      if (m) created = `${m[3]}-${m[1]}-${m[2]}T${String(m[4]).padStart(2, '0')}:${m[5]}:00+08:00`;
      const notes = [o.req && ('Request: ' + o.req), o.notes, o.fb && o.fb !== o.name && ('FB: ' + o.fb), o.invoice && ('Invoice: ' + o.invoice)].filter(Boolean).join(' | ');
      const rec = {
        order_number: oid, customer_name: o.name, customer_email: o.email || null,
        contact_number: o.contact, shipping_address: o.addr, items: o.items,
        subtotal: total, shipping_fee: 0, discount_amount: 0, total,
        payment_method: o.pm || 'unknown', notes: notes || null,
        status, payment_status: o.pay === 'paid' ? 'verified' : 'pending',
        courier: o.courier || null, tracking_reference: o.track || null,
        region: o.region || null, city: o.city || null, source: 'sheet_import',
      };
      rec.created_at = created || new Date().toISOString(); // uniform keys — PostgREST bulk insert requires it
      payload.push(rec);
    }

    let inserted = 0;
    for (let i = 0; i < payload.length; i += 100) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders?on_conflict=order_number`, {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(payload.slice(i, i + 100)),
      });
      if (!r.ok) return res.status(502).json({ error: await r.text(), imported: inserted });
      const out = await r.json();
      if (Array.isArray(out)) {
        inserted += out.length;
        // Newly imported orders came from the FB form channel — the sale already
        // happened, so reserve/deduct their stock (clamped, never fails).
        for (const o of out) {
          if (o.status === 'cancelled') continue;
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/sb_soft_decrement`, {
              method: 'POST', headers: H, body: JSON.stringify({ p_items: o.items || [] }),
            });
          } catch (e) { /* non-fatal */ }
        }
      }
    }

    await fetch(`${SUPABASE_URL}/rest/v1/sync_log`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ sync_type: 'order_import', total: payload.length, synced: inserted, triggered_by: 'admin', notes: 'SB ORDER sheet -> sb_orders (insert-only)' }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, parsed: payload.length, imported: inserted, tabs: tabCounts });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
