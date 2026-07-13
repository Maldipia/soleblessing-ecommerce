// Import NEW rows from Google Sheets into sb_inventory (single source of truth = DB).
// Existing DB rows are NEVER overwritten (ON CONFLICT ignore) — the sheet is only a
// feed for newly-added items. 10-minute cooldown guards against abuse.
const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const GID_2025 = '631652219';
const GID_2024 = '0';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}
function parsePrice(v) {
  const n = parseFloat(String(v).replace(/[₱,\s]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });

  const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  try {
    // Cooldown: last import must be > 10 min ago (tracked in sync_log)
    const logRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sync_log?sync_type=eq.sheet_import&order=created_at.desc&limit=1&select=created_at`, { headers: H });
    if (logRes.ok) {
      const [last] = await logRes.json();
      if (last && Date.now() - new Date(last.created_at).getTime() < 10 * 60 * 1000) {
        return res.status(429).json({ error: 'Import ran recently — wait a few minutes', imported: 0 });
      }
    }

    const [csv25, csv24] = await Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_2025}`).then(r => r.ok ? r.text() : ''),
      fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_2024}`).then(r => r.ok ? r.text() : '').catch(() => ''),
    ]);
    if (!csv25) return res.status(502).json({ error: 'Sheet fetch failed' });

    const allLines = [
      ...csv25.split('\n').slice(2).map(l => ({ line: l, tab: '2025' })),
      ...csv24.split('\n').slice(2).map(l => ({ line: l, tab: '2024' })),
    ];

    const seen = new Set();
    const rows = [];
    for (const { line, tab } of allLines) {
      if (!line.trim()) continue;
      const row = parseCSVLine(line);
      if (row.length < 7) continue;
      const item_code = (row[0] || '').trim();
      const name = (row[1] || '').trim();
      const sku = (row[2] || '').trim();
      const size = (row[3] || '').trim();
      const unit_cost = parsePrice(row[4] || '');
      const selling_price = parsePrice(row[5] || '');
      const status = (row[6] || '').toUpperCase().trim();
      const srp = parsePrice(row[13] || '');
      const drive_url = (row[18] || '').trim();
      if (!item_code || !name || !size) continue;
      if (seen.has(item_code)) continue;
      seen.add(item_code);
      const MAX = 9999900;
      rows.push({
        item_code, name, sku, size,
        srp: srp <= MAX ? srp : 0,
        selling_price: selling_price <= MAX ? selling_price : 0,
        unit_cost: unit_cost <= MAX ? unit_cost : 0,
        status, stock: 1, drive_url, tab,
      });
    }

    // Insert in chunks; ignore-duplicates keeps DB rows authoritative
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_inventory?on_conflict=item_code`, {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(chunk),
      });
      if (!r.ok) return res.status(502).json({ error: await r.text(), imported: inserted });
      const out = await r.json();
      inserted += Array.isArray(out) ? out.length : 0;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/sync_log`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ sync_type: 'sheet_import', total: rows.length, synced: inserted, triggered_by: 'admin', notes: 'insert-only import (DB is source of truth)' }),
    }).catch(() => {});

    return res.status(200).json({ ok: true, parsed: rows.length, imported: inserted });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
