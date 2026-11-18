// Privileged admin endpoint — uses the Supabase SERVICE ROLE key (bypasses RLS),
// gated by ADMIN_PASSWORD. The service key NEVER reaches the browser.
import { timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// ── P0.1: brute-force protection ─────────────────────────────────────────────
// Two layers, because serverless instances don't share memory:
//  1. In-memory per-IP bucket (fast path): 5 failures / 10 min → 15-min cooldown
//     on this instance, no DB round-trip needed to reject.
//  2. Durable check in sb_auth_events (service-role-only table): 10 failures
//     from an IP across ALL instances in 10 min → 15-min cooldown. Failures are
//     always recorded; successful logins are recorded for the audit trail.
// Lockouts are temporary (cooldown, never permanent) and per-IP, so a staff
// member who fat-fingers a PIN is back in after the cooldown — and other
// locations/devices are unaffected.
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MEM_MAX_FAILS = 5;       // per instance
const DB_MAX_FAILS  = 10;      // across instances
const authMem = (globalThis.__sbAuthRL ||= new Map());

const ipOf = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

function memState(ip) {
  const now = Date.now();
  let e = authMem.get(ip);
  if (!e) { e = { fails: [], lockUntil: 0 }; authMem.set(ip, e); }
  e.fails = e.fails.filter((t) => now - t < FAIL_WINDOW_MS);
  if (authMem.size > 5000) {
    for (const [k, v] of authMem) if (v.lockUntil < now && !v.fails.length) authMem.delete(k);
  }
  return e;
}

// Constant-time string compare (pads to equal length so length isn't leaked
// through timingSafeEqual's length requirement).
function safeEq(a, b) {
  const max = Math.max(Buffer.byteLength(a), Buffer.byteLength(b), 1);
  const ba = Buffer.alloc(max), bb = Buffer.alloc(max);
  ba.write(String(a)); bb.write(String(b));
  return timingSafeEqual(ba, bb) && a.length === b.length;
}

const H_SVC = () => ({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' });

// Best-effort: an unreachable log table must never take the admin down.
async function logAuthEvent(ip, ok, role, op) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/sb_auth_events`, {
      method: 'POST',
      headers: { ...H_SVC(), Prefer: 'return=minimal' },
      body: JSON.stringify({ ip, ok, role: role || null, op: op || null }),
    });
  } catch { /* best-effort */ }
}
async function recentDbFails(ip) {
  try {
    const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/sb_auth_events?ip=eq.${encodeURIComponent(ip)}&ok=eq.false&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${DB_MAX_FAILS + 1}`,
      { headers: H_SVC() },
    );
    if (!r.ok) return 0;
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) ? rows.length : 0;
  } catch { return 0; }
}
function reject429(res, lockUntil) {
  const secs = Math.max(1, Math.ceil((lockUntil - Date.now()) / 1000));
  res.setHeader('Retry-After', String(secs));
  return res.status(429).json({ error: `too many attempts — try again in ${Math.ceil(secs / 60)} min` });
}

const ALLOWED = new Set([
  'sb_orders','sb_products','sb_promos','sb_settings','sb_reviews',
  'sb_promo_uses','sb_loyalty','sb_loyalty_transactions','sb_wishlist_log','sb_inventory',
  'sync_log','sb_deleted_orders','sb_customers',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY)            return res.status(500).json({ error: 'service key missing' });
  if (!ADMIN_PASSWORD)         return res.status(500).json({ error: 'admin password not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, op, table, query = '', data } = body || {};

  // ── P0.1: reject locked-out IPs before any credential check ──
  const ip = ipOf(req);
  const rl = memState(ip);
  if (rl.lockUntil > Date.now()) return reject429(res, rl.lockUntil);

  // Staff admins (SA01…): scanner-only accounts defined in sb_settings.staff_admins.
  // Each staff PIN can ONLY read + add inventory; added_by is stamped SERVER-SIDE
  // from the authenticated PIN, so accountability can't be spoofed from the client.
  let staff = null;
  const isOwner = ADMIN_PASSWORD && safeEq(String(password ?? ''), ADMIN_PASSWORD);
  if (!isOwner) {
    try {
      const sres = await fetch(`${SUPABASE_URL}/rest/v1/sb_settings?key=eq.staff_admins&select=value`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const [row] = sres.ok ? await sres.json() : [];
      const list = row ? JSON.parse(row.value || '[]') : [];
      staff = list.find(s => s && s.active !== false && String(s.pin) === String(password)) || null;
    } catch { staff = null; }
    if (!staff) {
      // failed authentication: record it, count it, lock the IP if over limits
      rl.fails.push(Date.now());
      await logAuthEvent(ip, false, null, op);
      const dbFails = rl.fails.length >= MEM_MAX_FAILS ? DB_MAX_FAILS : await recentDbFails(ip);
      if (rl.fails.length >= MEM_MAX_FAILS || dbFails >= DB_MAX_FAILS) {
        rl.lockUntil = Date.now() + LOCK_MS;
        return reject429(res, rl.lockUntil);
      }
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  // successful authentication: clear this IP's failure streak; log logins
  rl.fails = [];
  if (op === 'auth') {
    logAuthEvent(ip, true, staff ? staff.id : 'OWNER', op); // fire-and-forget
    return res.status(200).json({ ok: true, role: staff ? staff.id : 'OWNER', color: staff ? staff.color : '#C9A84C' });
  }

  if (staff) {
    // Least privilege per role. Scanner = view + add inventory only.
    // Manager = run the floor: scan/edit inventory, view + process orders,
    // view products. NEVER sb_settings (holds the PINs), never deletes.
    const PERMS = staff.role === 'manager' ? {
      sb_inventory: ['select', 'insert', 'upsert', 'update'],
      sb_orders:    ['select', 'update', 'delete'],
      sb_deleted_orders: ['select', 'insert'],
      sb_customers: ['select', 'insert', 'upsert', 'update', 'delete'],
      sb_products:  ['select'],
      sync_log:     ['select'],
      sb_reviews:   ['select'],
      sb_promos:    ['select'],
      sb_loyalty:   ['select'],
      sb_wishlist_log: ['select'],
    } : {
      sb_inventory: ['select', 'insert', 'upsert'],
    };
    const allowedForStaff = (PERMS[table] || []).includes(op);
    if (!allowedForStaff) return res.status(403).json({ error: staff.role === 'manager' ? 'managers cannot do that' : 'staff accounts can only view and add inventory' });
    if (table === 'sb_inventory' && (op === 'insert' || op === 'upsert') && data) {
      const stamp = (r) => ({ ...r, added_by: staff.id, tab: 'SCAN' });
      body.data = Array.isArray(data) ? data.map(stamp) : stamp(data);
    }
  }
  if (!ALLOWED.has(table)) return res.status(400).json({ error: 'table not allowed' });

  const method = op === 'select' ? 'GET' : (op === 'insert' || op === 'upsert') ? 'POST'
               : op === 'update' ? 'PATCH' : op === 'delete' ? 'DELETE' : null;
  if (!method) return res.status(400).json({ error: 'bad op' });

  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? ('?' + query) : ''}`;
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: op === 'upsert' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
  };
  try {
    const r = await fetch(url, {
      method, headers,
      body: (op === 'insert' || op === 'upsert' || op === 'update') ? JSON.stringify(body.data) : undefined,
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });
    try { return res.status(200).json(JSON.parse(text || '[]')); }
    catch { return res.status(200).json([]); }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
