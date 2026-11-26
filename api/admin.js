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

  // Payment-proof viewing — owner/manager only. Proofs live in PRIVATE storage;
  // the DB stores only the bucket path, and admins get a 10-minute signed URL.
  if (op === 'proof_url') {
    if (staff && staff.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
    const path = String(body.path || '');
    if (!/^payment-proofs\/[A-Za-z0-9/_.-]{3,200}$/.test(path) || path.includes('..'))
      return res.status(400).json({ error: 'bad proof path' });
    try {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 600 }),
      });
      const out = await r.json().catch(() => null);
      if (!r.ok || !out || !out.signedURL) return res.status(502).json({ error: 'could not sign proof URL' });
      return res.status(200).json({ ok: true, url: `${SUPABASE_URL}/storage/v1${out.signedURL}` });
    } catch { return res.status(500).json({ error: 'could not sign proof URL' }); }
  }

  // Payment ledger (manual / staff-recorded payments + layaway installments).
  // ── SOCIAL (read-only Metricool proxy) — Pia's approved Social Media section.
  // Shows the SoleBlessing brand's schedule inside the admin. View-only on
  // purpose: posting stays in Metricool, so no double-posting risk. The token
  // lives ONLY in server env (like RESEND_API_KEY) — never reaches the browser.
  if (op === 'social') {
    // Reads the sb_social_posts mirror that Claude syncs from Metricool via the
    // connector (her $25 plan has no Metricool API; this path costs nothing).
    // view:'metrics' → follower/views/interactions timelines + top posts
    if (body.view === 'metrics') {
      const since = new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10);
      const mR = await fetch(`${SUPABASE_URL}/rest/v1/sb_social_metrics?day=gte.${since}&select=network,metric,day,value,synced_at&order=day.asc&limit=1000`, { headers: H_SVC() });
      const pR = await fetch(`${SUPABASE_URL}/rest/v1/sb_social_post_stats?select=network,post_id,posted_at,reach,interactions,link_clicks,raw&order=reach.desc&limit=12`, { headers: H_SVC() });
      if (!mR.ok) return res.status(502).json({ error: 'metrics table unavailable — is the social_metrics_v1 migration applied?' });
      const metrics = await mR.json();
      const topPosts = pR.ok ? await pR.json() : [];
      const syncedAt = metrics.reduce((m, x) => (x.synced_at > m ? x.synced_at : m), '') || null;
      return res.status(200).json({ ok: true, metrics, topPosts, syncedAt });
    }
    const from = String(body.from || '').slice(0, 19);
    const to = String(body.to || '').slice(0, 19);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(to)) return res.status(400).json({ error: 'from/to required (YYYY-MM-DDTHH:MM:SS)' });
    const q = `publication_at=gte.${encodeURIComponent(from + '+08:00')}&publication_at=lte.${encodeURIComponent(to + '+08:00')}&select=raw,synced_at&order=publication_at.asc&limit=500`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_social_posts?${q}`, { headers: H_SVC() });
    if (!r.ok) return res.status(502).json({ error: 'social posts table unavailable — is the social_posts_v1 migration applied?' });
    const rows = await r.json();
    // lastSync = newest sync overall (not just this week) so an empty week
    // doesn't look like "never synced"
    let lastSync = null;
    try {
      const m = await fetch(`${SUPABASE_URL}/rest/v1/sb_social_posts?select=synced_at&order=synced_at.desc&limit=1`, { headers: H_SVC() });
      const [mr] = m.ok ? await m.json() : [];
      lastSync = (mr && mr.synced_at) || null;
    } catch {}
    return res.status(200).json({ ok: true, posts: rows.map((x) => x.raw), syncedAt: lastSync });
  }

  // ⚡ Promotions (flash sales) — campaign manager, OWNER/manager only.
  // Prices are NEVER edited in inventory; campaigns overlay them. Checkout
  // enforcement lives in sb_place_order (server-side), the site applies the
  // flash price via /api/inventory.
  if (op === 'flash') {
    if (staff && staff.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
    const action = String(body.action || 'list');
    const nowIso = () => new Date().toISOString();

    if (action === 'list') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_flash_sales?select=*&order=created_at.desc&limit=100`, { headers: H_SVC() });
      if (!r.ok) return res.status(502).json({ error: 'flash table unavailable — is the flash_sales_v1 migration applied?' });
      const rows = await r.json();
      const now = Date.now();
      const state = (f) => f.status !== 'active' ? f.status
        : now < new Date(f.starts_at).getTime() ? 'scheduled'
        : now >= new Date(f.ends_at).getTime() ? 'ended'
        : (f.stock_limit != null && (f.sold || 0) >= f.stock_limit) ? 'soldout' : 'live';
      return res.status(200).json({ ok: true, campaigns: rows.map(f => ({ ...f, state: state(f) })) });
    }

    if (action === 'create') {
      const name = String(body.name || '').trim();
      const codes = Array.isArray(body.item_codes) ? body.item_codes.map(c => String(c).trim()).filter(Boolean) : [];
      const skus = Array.isArray(body.skus) ? body.skus.map(s => String(s).trim()).filter(Boolean) : [];
      const salePrice = Number(body.sale_price) > 0 ? Math.round(Number(body.sale_price)) : null; // centavos
      const percent = Number(body.percent) >= 1 && Number(body.percent) <= 90 ? Math.round(Number(body.percent)) : null;
      const hours = Math.min(Math.max(Number(body.hours) || 12, 1), 24 * 14);
      const startsAt = body.starts_at ? new Date(body.starts_at) : new Date();
      const stockLimit = Number(body.stock_limit) > 0 ? Math.round(Number(body.stock_limit)) : null;
      const banner = body.banner !== false;
      if (!name) return res.status(400).json({ error: 'name required' });
      if (!codes.length) return res.status(400).json({ error: 'item_codes required' });
      if (!salePrice && !percent) return res.status(400).json({ error: 'sale_price (centavos) or percent (1-90) required' });
      if (isNaN(startsAt)) return res.status(400).json({ error: 'bad starts_at' });
      const endsAt = new Date(startsAt.getTime() + hours * 3600000);

      // SAFEGUARD: no stacking — reject overlap with any other non-ended campaign
      const r0 = await fetch(`${SUPABASE_URL}/rest/v1/sb_flash_sales?status=eq.active&ends_at=gt.${encodeURIComponent(nowIso())}&select=id,name,item_codes,starts_at,ends_at`, { headers: H_SVC() });
      const existing = r0.ok ? await r0.json() : [];
      const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
      const mine = new Set(codes.map(norm));
      for (const f of existing) {
        const tOverlap = new Date(f.starts_at) < endsAt && new Date(f.ends_at) > startsAt;
        if (tOverlap && (f.item_codes || []).some(c => mine.has(norm(c)))) {
          return res.status(409).json({ error: `overlaps campaign "${f.name}" — end it first or pick other items` });
        }
      }
      // items must exist & be priced (flash needs a base price for % + display)
      const inList = codes.map(c => encodeURIComponent(c)).join(',');
      const r1 = await fetch(`${SUPABASE_URL}/rest/v1/sb_inventory?item_code=in.(${inList})&select=item_code,selling_price,srp,status`, { headers: H_SVC() });
      const found = r1.ok ? await r1.json() : [];
      if (found.length !== codes.length) return res.status(400).json({ error: `only ${found.length} of ${codes.length} item codes found in inventory` });
      const unpriced = found.filter(x => !(x.selling_price || x.srp));
      if (unpriced.length) return res.status(400).json({ error: `unpriced items: ${unpriced.map(x => x.item_code).join(', ')}` });

      const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_flash_sales`, {
        method: 'POST', headers: { ...H_SVC(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ name, promo_type: salePrice ? 'flash' : 'percent', item_codes: codes, skus, sale_price: salePrice, percent, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), stock_limit: stockLimit, banner, status: 'active' }),
      });
      const [row] = ins.ok ? await ins.json() : [];
      if (!row) return res.status(502).json({ error: 'create failed' });
      return res.status(200).json({ ok: true, campaign: row });
    }

    if (action === 'end' || action === 'cancel') {
      const id = String(body.id || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'bad id' });
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_flash_sales?id=eq.${id}`, {
        method: 'PATCH', headers: { ...H_SVC(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ status: action === 'cancel' ? 'cancelled' : 'ended', ends_at: nowIso() }),
      });
      const [row] = r.ok ? await r.json() : [];
      if (!row) return res.status(502).json({ error: 'end failed' });
      return res.status(200).json({ ok: true, campaign: row });
    }
    return res.status(400).json({ error: 'unknown flash action' });
  }

  // Entries are REAL database records — balances everywhere compute from them.
  // Any authenticated staff can RECORD (with their identity stamped);
  // VERIFY / REJECT / REMOVE stay owner-manager only, mirroring the existing
  // proof-verification rules. Recording NEVER flips the order's payment_status.
  if (op === 'payment_entry') {
    const actorName = staff ? staff.id : 'OWNER';
    const action = String(body.action || 'list');
    const orderNo = String(body.order_number || '').trim().toUpperCase();
    if (!orderNo) return res.status(400).json({ error: 'order_number required' });
    const H2 = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    try {
      if (action === 'list') {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_payment_entries?order_number=eq.${encodeURIComponent(orderNo)}&order=paid_at.asc,created_at.asc`, { headers: H2 });
        const entries = r.ok ? await r.json() : [];
        return res.status(200).json({ ok: true, entries });
      }
      if (action === 'add') {
        const amount = Math.round(Number(body.amount) || 0); // centavos
        if (!(amount > 0)) return res.status(400).json({ error: 'amount (centavos) required' });
        const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(String(body.paid_at || '')) ? body.paid_at : undefined;
        let attachment_path = null;
        if (body.fileBase64 && body.mimeType) {
          if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(body.mimeType)) return res.status(400).json({ error: 'jpeg/png/webp/pdf only' });
          const buf = Buffer.from(String(body.fileBase64), 'base64');
          if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'max 5MB' });
          const ext = body.mimeType === 'application/pdf' ? 'pdf' : body.mimeType === 'image/png' ? 'png' : body.mimeType === 'image/webp' ? 'webp' : 'jpg';
          const p = `manual-payments/${orderNo}/${Date.now()}.${ext}`;
          const up = await fetch(`${SUPABASE_URL}/storage/v1/object/payment-proofs/${p}`, {
            method: 'POST', headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': body.mimeType, 'x-upsert': 'true' }, body: buf,
          });
          if (!up.ok) return res.status(502).json({ error: 'attachment upload failed' });
          attachment_path = `payment-proofs/${p}`;
        }
        const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_payment_entries`, {
          method: 'POST', headers: H2,
          body: JSON.stringify({ order_number: orderNo, amount, ...(paidAt ? { paid_at: paidAt } : {}),
            reference: String(body.reference || '').slice(0, 120) || null,
            remarks: String(body.remarks || '').slice(0, 300) || null,
            attachment_path, entered_by: actorName }),
        });
        const [entry] = ins.ok ? await ins.json() : [];
        if (!entry) return res.status(502).json({ error: 'could not save payment entry' });
        await logOrderEvent({ order_number: orderNo, actor: actorName, action: 'payment_recorded',
          new_value: { entry_id: entry.id, amount, reference: entry.reference, paid_at: entry.paid_at } });
        return res.status(200).json({ ok: true, entry });
      }
      // verify / reject / remove — owner-manager only
      if (staff && staff.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
      const entryId = parseInt(body.entry_id);
      if (!entryId) return res.status(400).json({ error: 'entry_id required' });
      if (action === 'verify' || action === 'reject') {
        // Only a RECORDED entry can move — a verified one is final (duplicate-
        // verification guard, same spirit as the proof flow).
        const nextStatus = action === 'verify' ? 'verified' : 'rejected';
        const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_payment_entries?id=eq.${entryId}&order_number=eq.${encodeURIComponent(orderNo)}&status=eq.recorded`, {
          method: 'PATCH', headers: H2,
          body: JSON.stringify({ status: nextStatus, verified_by: actorName, verified_at: new Date().toISOString() }),
        });
        const rows = r.ok ? await r.json() : [];
        if (!rows.length) return res.status(409).json({ error: 'entry not found or already decided' });
        await logOrderEvent({ order_number: orderNo, actor: actorName, action: `payment_entry_${nextStatus}`,
          new_value: { entry_id: entryId, amount: rows[0].amount, reference: rows[0].reference } });
        return res.status(200).json({ ok: true, entry: rows[0] });
      }
      if (action === 'remove') {
        const g = await fetch(`${SUPABASE_URL}/rest/v1/sb_payment_entries?id=eq.${entryId}&order_number=eq.${encodeURIComponent(orderNo)}`, { headers: H2 });
        const [old] = g.ok ? await g.json() : [];
        if (!old) return res.status(404).json({ error: 'entry not found' });
        await fetch(`${SUPABASE_URL}/rest/v1/sb_payment_entries?id=eq.${entryId}`, { method: 'DELETE', headers: H2 });
        await logOrderEvent({ order_number: orderNo, actor: actorName, action: 'payment_entry_deleted',
          old_value: { entry_id: entryId, amount: old.amount, reference: old.reference, status: old.status } });
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'unknown payment_entry action' });
    } catch (e) {
      return res.status(500).json({ error: String(e && e.message || e) });
    }
  }

  // Secure customer invoice links — owner/manager only. The customer gets
  // /invoice/t/<token> with 7-day access by default. Issue = reissue (old
  // links die), extend pushes the expiry, revoke kills access NOW. Expiry and
  // revocation touch CUSTOMER ACCESS ONLY — order, invoice and payment records
  // stay permanently in the dashboard. Every action is audited.
  if (op === 'invoice_link') {
    if (staff && staff.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
    const actorName = staff ? staff.id : 'OWNER';
    const orderNo = String(body.order_number || '').trim().toUpperCase();
    const action = String(body.action || 'issue');
    const days = Math.min(Math.max(parseInt(body.days) || 7, 1), 60);
    if (!/^SB-[A-Z0-9-]{4,24}$/.test(orderNo)) return res.status(400).json({ error: 'order_number required' });
    const nowIso = () => new Date().toISOString();
    try {
      if (action === 'status') {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/sb_invoice_tokens?order_number=eq.${encodeURIComponent(orderNo)}&order=issued_at.desc&limit=1&select=token,issued_at,issued_by,expires_at,extended_at,revoked_at`, { headers: H_SVC() });
        const [t] = r.ok ? await r.json() : [];
        if (!t) return res.status(200).json({ ok: true, link: null });
        const active = !t.revoked_at && new Date(t.expires_at).getTime() > Date.now();
        return res.status(200).json({ ok: true, link: { ...t, token: active ? t.token : null, active } });
      }
      if (action === 'issue') {
        // reissue semantics: any previous active link dies the moment a new one exists
        const rv = await fetch(`${SUPABASE_URL}/rest/v1/sb_invoice_tokens?order_number=eq.${encodeURIComponent(orderNo)}&revoked_at=is.null`, {
          method: 'PATCH', headers: { ...H_SVC(), Prefer: 'return=representation' },
          body: JSON.stringify({ revoked_at: nowIso(), revoked_by: actorName }),
        });
        const prev = rv.ok ? await rv.json() : [];
        const { randomBytes } = await import('node:crypto');
        const token = randomBytes(24).toString('base64url');
        const expires_at = new Date(Date.now() + days * 86400000).toISOString();
        const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_invoice_tokens`, {
          method: 'POST', headers: { ...H_SVC(), Prefer: 'return=representation' },
          body: JSON.stringify({ order_number: orderNo, token, issued_by: actorName, expires_at }),
        });
        if (!ins.ok) return res.status(502).json({ error: 'could not issue link — is the invoice-tokens migration applied?' });
        await logOrderEvent({ order_number: orderNo, actor: actorName, action: 'invoice_link_issued',
          new_value: { expires_at, days, reissued: prev.length > 0 } });
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return res.status(200).json({ ok: true, url: `https://${host}/invoice/t/${token}`, token, expires_at, reissued: prev.length > 0 });
      }
      if (action === 'extend') {
        const up = await fetch(`${SUPABASE_URL}/rest/v1/sb_invoice_tokens?order_number=eq.${encodeURIComponent(orderNo)}&revoked_at=is.null`, {
          method: 'PATCH', headers: { ...H_SVC(), Prefer: 'return=representation' },
          body: JSON.stringify({ expires_at: new Date(Date.now() + days * 86400000).toISOString(), extended_at: nowIso(), extended_by: actorName }),
        });
        const rows = up.ok ? await up.json() : [];
        if (!rows.length) return res.status(404).json({ error: 'no active link to extend — issue one first' });
        await logOrderEvent({ order_number: orderNo, actor: actorName, action: 'invoice_link_extended', new_value: { expires_at: rows[0].expires_at, days } });
        return res.status(200).json({ ok: true, expires_at: rows[0].expires_at });
      }
      if (action === 'revoke') {
        const rv = await fetch(`${SUPABASE_URL}/rest/v1/sb_invoice_tokens?order_number=eq.${encodeURIComponent(orderNo)}&revoked_at=is.null`, {
          method: 'PATCH', headers: { ...H_SVC(), Prefer: 'return=representation' },
          body: JSON.stringify({ revoked_at: nowIso(), revoked_by: actorName }),
        });
        const rows = rv.ok ? await rv.json() : [];
        await logOrderEvent({ order_number: orderNo, actor: actorName, action: 'invoice_link_revoked', new_value: { revoked: rows.length } });
        return res.status(200).json({ ok: true, revoked: rows.length });
      }
      return res.status(400).json({ error: 'unknown action' });
    } catch { return res.status(500).json({ error: 'invoice link operation failed' }); }
  }

  // Request a NEW payment proof — owner/manager only, reason REQUIRED.
  // Conditional update: a verified payment can never be flipped back here,
  // and the reason reaches both the audit log and (via track-order) the customer.
  if (op === 'request_reupload') {
    if (staff && staff.role !== 'manager') return res.status(403).json({ error: 'not allowed' });
    const orderNo = String(body.order_number || '').trim().toUpperCase();
    const reason = String(body.reason || '').trim().slice(0, 300);
    if (!/^SB-[A-Z0-9-]{4,24}$/.test(orderNo)) return res.status(400).json({ error: 'order_number required' });
    if (reason.length < 3) return res.status(400).json({ error: 'a reason is required when requesting a new proof' });
    const actorName = staff ? staff.id : 'OWNER';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/sb_orders?order_number=eq.${encodeURIComponent(orderNo)}&payment_status=in.(submitted,pending,awaiting_full_payment,reupload)`,
        { method: 'PATCH', headers: { ...H_SVC(), Prefer: 'return=representation' },
          body: JSON.stringify({ payment_status: 'reupload', updated_at: new Date().toISOString() }) },
      );
      const rows = r.ok ? await r.json() : [];
      if (!rows.length) return res.status(409).json({ error: 'nothing to request — payment may already be verified' });
      await logOrderEvent({ order_number: orderNo, actor: actorName, action: 'proof_reupload_requested', new_value: { reason } });
      return res.status(200).json({ ok: true });
    } catch { return res.status(500).json({ error: 'request failed' }); }
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
    if ((table === 'sb_orders' || table === 'sb_order_requests') && (op === 'update' || op === 'delete')) {
      try {
        const pre = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? ('?' + query + '&') : '?'}limit=5`, { headers: H_SVC() });
        before = pre.ok ? await pre.json() : null;
      } catch { before = null; }
    }
    // Order-form requests: server stamps the reviewer — client-sent values are overwritten,
    // so reviewed_by always reflects the authenticated admin actor.
    if (table === 'sb_order_requests' && op === 'update' && body.data && typeof body.data === 'object') {
      body.data.reviewed_by = actor;
      body.data.reviewed_at = new Date().toISOString();
    }

    const r = await fetch(url, {
      method, headers,
      body: (op === 'insert' || op === 'upsert' || op === 'update') ? JSON.stringify(body.data) : undefined,
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: text });

    if (Array.isArray(before) && before.length) {
      const isReq = table === 'sb_order_requests';
      const skip = new Set(['updated_at', 'reviewed_at']);
      const entries = before.map((row) => {
        const ref = isReq ? row.request_ref : row.order_number;
        if (op === 'delete') {
          return { order_number: ref, actor, action: isReq ? 'request_delete' : 'delete', old_value: row, new_value: null };
        }
        const changed = {};
        for (const k of Object.keys(body.data || {})) if (!skip.has(k)) changed[k] = row[k];
        return { order_number: ref, actor, action: isReq ? 'request_update' : 'update', old_value: changed, new_value: Object.fromEntries(Object.entries(body.data || {}).filter(([k]) => !skip.has(k))) };
      });
      logOrderEvent(entries); // fire-and-forget
    }

    try { return res.status(200).json(JSON.parse(text || '[]')); }
    catch { return res.status(200).json([]); }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
