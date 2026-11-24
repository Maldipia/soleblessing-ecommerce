// Privileged admin endpoint — uses the Supabase SERVICE ROLE key (bypasses RLS),
// gated by ADMIN_PASSWORD / staff PIN at login, then by a signed 7-day session
// token (P1: the browser no longer stores the password).
import { verifyCredential, makeToken, cors, logOrderEvent } from '../server/auth.js';

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
  'sync_log','sb_deleted_orders','sb_customers','sb_order_log','sb_order_requests',
]);

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY)            return res.status(500).json({ error: 'service key missing' });
  if (!ADMIN_PASSWORD)         return res.status(500).json({ error: 'admin password not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, token, op, table, query = '', data } = body || {};

  // ── P0.1: reject locked-out IPs before any credential check ──
  const ip = ipOf(req);
  const rl = memState(ip);
  if (rl.lockUntil > Date.now()) return reject429(res, rl.lockUntil);

  // Credential check: session token (preferred) or password/PIN (login + legacy).
  // Staff perms stay least-privilege; added_by is stamped SERVER-SIDE below.
  const cred = await verifyCredential({ password, token });
  const staff = cred?.kind === 'staff' ? cred.staff : null;
  if (!cred) {
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

  // successful authentication: clear this IP's failure streak; log logins
  rl.fails = [];
  const actor = staff ? staff.id : 'OWNER';
  if (op === 'auth') {
    logAuthEvent(ip, true, actor, op); // fire-and-forget
    return res.status(200).json({
      ok: true, role: actor, color: staff ? staff.color : '#C9A84C',
      // P1: signed 7-day session token — the client stores THIS, not the password
      token: makeToken(actor, staff ? (staff.role || 'staff') : 'OWNER'),
    });
  }

  // Visitor analytics summary — OWNER and manager only (scanner PINs blocked).
  // Calls the security-definer SQL function; raw analytics tables stay RLS-locked.
  if (op === 'analytics') {
    if (staff && staff.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
    const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
    const iso = (x, fb) => { const d = new Date(x || fb); return isNaN(d) ? new Date(fb).toISOString() : d.toISOString(); };
    const now = Date.now(), day = 86400000;
    const p_from = iso(body.from, now - 7 * day), p_to = iso(body.to, now);
    const span = new Date(p_to) - new Date(p_from);
    const p_prev_to = p_from, p_prev_from = new Date(new Date(p_from) - span).toISOString();
    try {
      if (body.rollup) {
        fetch(`${SUPABASE_URL}/rest/v1/rpc/sb_analytics_rollup`, {
          method: 'POST', headers: H, body: '{}',
        }).catch(() => {}); // fire-and-forget daily rollup + retention prune
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sb_analytics_summary`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ p_from, p_to, p_prev_from, p_prev_to }),
      });
      const out = await r.json().catch(() => null);
      if (!r.ok) return res.status(502).json({ error: 'analytics failed' });
      return res.status(200).json({ summary: out, range: { from: p_from, to: p_to } });
    } catch (e) {
      return res.status(500).json({ error: 'analytics failed' });
    }
  }

  if (staff) {
    // Least privilege per role. Scanner = view + add inventory only.
    // Manager = run the floor: scan/edit inventory, view + process orders,
    // view products. NEVER sb_settings (holds the PINs), never deletes.
    const PERMS = staff.role === 'manager' ? {
      sb_inventory: ['select', 'insert', 'upsert', 'update'],
      sb_orders:    ['select', 'update', 'delete'],
      sb_deleted_orders: ['select', 'insert'],
      sb_order_requests: ['select', 'update'],
      sb_customers: ['select', 'insert', 'upsert', 'update', 'delete'],
      sb_order_log: ['select'],
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
    // P1 audit trail: snapshot order rows BEFORE a mutation so the log carries
    // old→new values — and a full snapshot on delete (recoverable from the log).
    let before = null;
    if (table === 'sb_orders' && (op === 'update' || op === 'delete')) {
      try {
        const pre = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders${query ? ('?' + query + '&') : '?'}limit=5`, { headers: H_SVC() });
        before = pre.ok ? await pre.json() : null;
      } catch { before = null; }
    }

    const r = await fetch(url, {
      method, headers,
      body: (op === 'insert' || op === 'upsert' || op === 'update') ? JSON.stringify(body.data) : undefined,
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });

    if (Array.isArray(before) && before.length) {
      const entries = before.map((row) => {
        if (op === 'delete') {
          return { order_number: row.order_number, actor, action: 'delete', old_value: row, new_value: null };
        }
        const changed = {};
        for (const k of Object.keys(body.data || {})) if (k !== 'updated_at') changed[k] = row[k];
        return { order_number: row.order_number, actor, action: 'update', old_value: changed, new_value: Object.fromEntries(Object.entries(body.data || {}).filter(([k]) => k !== 'updated_at')) };
      });
      logOrderEvent(entries); // fire-and-forget
    }

    try { return res.status(200).json(JSON.parse(text || '[]')); }
    catch { return res.status(200).json([]); }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
