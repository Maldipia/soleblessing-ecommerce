// Shared credential verification for all admin-gated API endpoints.
// Lives OUTSIDE api/ so Vercel doesn't expose it as a route; endpoints import it.
//
// P1 session hardening: the browser no longer stores the admin password.
// Login issues a signed, 7-day token (HMAC-SHA256). Every gated endpoint
// accepts { token } — and still accepts { password } so sessions created
// before this change keep working until their next login.
// The HMAC secret includes ADMIN_PASSWORD, so rotating the owner password
// in Vercel env invalidates every outstanding token at once.
import { createHmac, timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — phones stay signed in

const secret = () => `sb-session|${SERVICE_KEY}|${ADMIN_PASSWORD}`;
const b64u = (s) => Buffer.from(s).toString('base64url');
const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function safeEq(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  const max = Math.max(Buffer.byteLength(a), Buffer.byteLength(b), 1);
  const ba = Buffer.alloc(max), bb = Buffer.alloc(max);
  ba.write(a); bb.write(b);
  return timingSafeEqual(ba, bb) && a.length === b.length;
}

export function makeToken(identity, role) {
  const payload = b64u(JSON.stringify({ i: identity, r: role, exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig || !safeEq(sign(payload), sig)) return null;
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!d || typeof d.exp !== 'number' || d.exp < Date.now()) return null;
    return d; // { i, r, exp }
  } catch { return null; }
}

async function staffList() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_settings?key=eq.staff_admins&select=value`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const [row] = r.ok ? await r.json() : [];
    return row ? JSON.parse(row.value || '[]') : [];
  } catch { return []; }
}

// → null | { kind:'owner' } | { kind:'staff', staff:{ id, role, color, ... } }
export async function verifyCredential({ password, token } = {}) {
  if (token) {
    const d = readToken(token);
    if (!d) return null;
    if (d.i === 'OWNER') return { kind: 'owner' };
    // staff token: honor later deactivation by re-checking the live list
    const s = (await staffList()).find((x) => x && x.active !== false && String(x.id) === String(d.i));
    return s ? { kind: 'staff', staff: s } : null;
  }
  if (password != null && password !== '') {
    if (ADMIN_PASSWORD && safeEq(password, ADMIN_PASSWORD)) return { kind: 'owner' };
    const s = (await staffList()).find((x) => x && x.active !== false && String(x.pin) === String(password));
    return s ? { kind: 'staff', staff: s } : null;
  }
  return null;
}

// Convenience: owner or manager (what most gated endpoints require).
export const isOwnerOrManager = (v) => !!v && (v.kind === 'owner' || v.staff?.role === 'manager');

// CORS: the admin and store APIs are only ever called from the site itself.
const ORIGINS = new Set(['https://www.soleblessingofficial.com', 'https://soleblessingofficial.com']);
export function cors(req, res) {
  const o = String(req.headers.origin || '');
  res.setHeader('Access-Control-Allow-Origin', ORIGINS.has(o) ? o : 'https://www.soleblessingofficial.com');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
}

// Best-effort order activity logging (actor attribution for the audit trail).
export async function logOrderEvent(entries) {
  try {
    const rows = (Array.isArray(entries) ? entries : [entries]).filter((e) => e && e.order_number && e.action);
    if (!rows.length) return;
    await fetch(`${SUPABASE_URL}/rest/v1/sb_order_log`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    });
  } catch { /* logging must never break the operation */ }
}
