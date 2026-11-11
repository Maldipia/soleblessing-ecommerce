// Shoe Cleaner "Play & Win" campaign endpoint.
// Public ops: config, register. Everything else needs ADMIN_PASSWORD (owner)
// or a manager staff PIN (view + discount redemption only).
// All DB access uses the SERVICE ROLE key server-side; sc_* tables have RLS
// enabled with no anon policies, and the atomic flows live in pg functions.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const sel = async (path) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`select ${path}: ${r.status} ${await r.text()}`);
  return r.json();
};
const rpc = async (fn, args) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) throw new Error(`rpc ${fn}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};
const write = async (method, path, data) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
};

// crude per-instance rate limit for public registration attempts
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || [];
  const recent = rec.filter(t => now - t < 60_000);
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 2000) hits.clear();
  return recent.length > 10;
}

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
  const { op, password } = body || {};

  try {
    // ── campaign row (newest active) ──
    const [camp] = await sel(`sc_campaigns?active=eq.true&order=created_at.desc&limit=1`);
    if (!camp) return res.status(200).json({ ok: false, error: 'no_campaign' });
    const cid = camp.id;

    // ═══ PUBLIC ═══
    if (op === 'config') {
      const content = await sel(`sc_content?campaign_id=eq.${cid}&select=key,value`);
      const kv = Object.fromEntries(content.map(c => [c.key, c.value]));
      const winners = await sel(
        `sc_raffle_winners?published=eq.true&select=status,created_at,raffle:sc_raffles(period),reg:sc_registrations(full_name)&order=created_at.desc&limit=12`
      ).catch(() => []);
      return res.status(200).json({
        ok: true, campaign: { name: camp.name, ends_on: camp.ends_on, discount_pct: camp.discount_pct },
        content: kv,
        winners: winners.map(w => ({
          period: w.raffle?.period,
          name: (w.reg?.full_name || '').replace(/(\S)\S+(\s)/g, '$1.$2'), // initials-ish, privacy
        })),
      });
    }

    if (op === 'register') {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0];
      if (limited(ip)) return res.status(429).json({ ok: false, error: 'rate_limited' });
      const { code, name, email, phone, profession, marketing, club, privacy } = body;
      if (!privacy) return res.status(400).json({ ok: false, error: 'privacy_required' });
      if (!code || !name || !email || !phone) return res.status(400).json({ ok: false, error: 'missing_fields' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return res.status(400).json({ ok: false, error: 'bad_email' });
      if (String(name).length > 120 || String(phone).length > 32 || String(profession || '').length > 80)
        return res.status(400).json({ ok: false, error: 'too_long' });
      const out = await rpc('sc_register', {
        p_code: String(code), p_name: String(name).trim(), p_email: String(email).trim(),
        p_phone: String(phone).trim(), p_profession: String(profession || '').trim(),
        p_marketing: !!marketing, p_club: String(club || '').trim(),
      });
      return res.status(200).json(out);
    }

    // ═══ ADMIN (owner password, or manager PIN for the ops listed) ═══
    let actor = 'OWNER'; let isOwner = password === ADMIN_PASSWORD && !!ADMIN_PASSWORD;
    if (!isOwner) {
      let staff = null;
      try {
        const [row] = await sel(`sb_settings?key=eq.staff_admins&select=value`);
        const list = row ? JSON.parse(row.value || '[]') : [];
        staff = list.find(s => s && s.active !== false && s.role === 'manager' && String(s.pin) === String(password)) || null;
      } catch { staff = null; }
      if (!staff) return res.status(401).json({ error: 'unauthorized' });
      actor = staff.id;
      const managerOps = new Set(['kpis', 'vouchers', 'registrations', 'raffles', 'partners', 'discounts', 'validate_discount', 'redeem']);
      if (!managerOps.has(op)) return res.status(403).json({ error: 'managers cannot do that' });
    }

    switch (op) {
      case 'kpis': {
        const count = async (p) => {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}&select=id&limit=1`, {
            headers: { ...H, Prefer: 'count=exact' },
          });
          return parseInt((r.headers.get('content-range') || '/0').split('/')[1] || '0', 10);
        };
        const [gen, dist, regd, redeemedV, voided, regs, winners, discRed] = await Promise.all([
          count(`sc_vouchers?campaign_id=eq.${cid}&status=eq.generated`),
          count(`sc_vouchers?campaign_id=eq.${cid}&status=eq.distributed`),
          count(`sc_vouchers?campaign_id=eq.${cid}&status=eq.registered`),
          count(`sc_vouchers?campaign_id=eq.${cid}&status=eq.redeemed`),
          count(`sc_vouchers?campaign_id=eq.${cid}&status=eq.voided`),
          count(`sc_registrations?campaign_id=eq.${cid}`),
          count(`sc_raffle_winners?status=neq.disqualified`),
          count(`sc_discounts?campaign_id=eq.${cid}&status=eq.redeemed`),
        ]);
        return res.status(200).json({
          ok: true, campaign: camp,
          k: {
            vouchers_total: gen + dist + regd + redeemedV + voided,
            generated: gen, distributed: dist, registered: regd, voucher_redeemed: redeemedV, voided,
            registrations: regs, raffle_entries: regs, winners,
            discounts_issued: regs, discounts_redeemed: discRed,
          },
        });
      }
      case 'vouchers': {
        const { q = '', status = '', limit = 200, offset = 0 } = body;
        let path = `sc_vouchers?campaign_id=eq.${cid}&select=id,code,status,distributed_at,created_at,batch:sc_batches(label),partner:sc_partners(name),reg:sc_registrations(ref,full_name,created_at,discount:sc_discounts(status))&order=created_at.desc&limit=${Math.min(+limit || 200, 1000)}&offset=${+offset || 0}`;
        if (q) path += `&code=ilike.*${encodeURIComponent(String(q).replace(/[%*,()]/g, ''))}*`;
        if (status) path += `&status=eq.${encodeURIComponent(status)}`;
        return res.status(200).json({ ok: true, rows: await sel(path) });
      }
      case 'voucher_codes': { // for PDF generation: all codes of one batch
        const { batch_id } = body;
        const rows = await sel(`sc_vouchers?batch_id=eq.${batch_id}&select=code&order=code.asc&limit=5000`);
        return res.status(200).json({ ok: true, codes: rows.map(r => r.code) });
      }
      case 'batches':
        return res.status(200).json({ ok: true, rows: await sel(`sc_batches?campaign_id=eq.${cid}&select=*,partner:sc_partners(name)&order=created_at.desc&limit=200`) });
      case 'gen_batch': {
        const { qty, label, partner_id } = body;
        const out = await rpc('sc_generate_batch', { p_qty: +qty || 0, p_label: String(label || 'Batch'), p_partner: partner_id || null, p_actor: actor });
        return res.status(200).json(out);
      }
      case 'void_voucher': {
        const { code, reason } = body;
        const rows = await write('PATCH', `sc_vouchers?campaign_id=eq.${cid}&code=eq.${encodeURIComponent(code)}&status=in.(generated,distributed)`,
          { status: 'voided', voided_at: new Date().toISOString(), void_reason: String(reason || '') });
        if (!rows?.length) return res.status(200).json({ ok: false, error: 'not_voidable' });
        await write('POST', 'sc_audit', { campaign_id: cid, actor, action: 'void_voucher', detail: { code, reason } });
        return res.status(200).json({ ok: true });
      }
      case 'registrations': {
        const { q = '', limit = 200, offset = 0 } = body;
        let path = `sc_registrations?campaign_id=eq.${cid}&select=id,ref,full_name,email,phone,profession,club,marketing_consent,privacy_consent_at,disqualified,created_at,voucher:sc_vouchers(code),discount:sc_discounts(code,status,redeemed_at,order_ref)&order=created_at.desc&limit=${Math.min(+limit || 200, 1000)}&offset=${+offset || 0}`;
        if (q) {
          const s = encodeURIComponent(String(q).replace(/[%*,()]/g, ''));
          path += `&or=(full_name.ilike.*${s}*,ref.ilike.*${s}*,phone.ilike.*${s}*,email.ilike.*${s}*)`;
        }
        return res.status(200).json({ ok: true, rows: await sel(path) });
      }
      case 'disqualify': {
        const { registration_id, on, reason } = body;
        await write('PATCH', `sc_registrations?id=eq.${registration_id}`, { disqualified: !!on, disqualify_reason: String(reason || '') });
        await write('POST', 'sc_audit', { campaign_id: cid, actor, action: on ? 'disqualify' : 'requalify', detail: { registration_id, reason } });
        return res.status(200).json({ ok: true });
      }
      case 'raffles': {
        const rows = await sel(`sc_raffles?campaign_id=eq.${cid}&select=*,winners:sc_raffle_winners(id,status,published,notes,created_at,reg:sc_registrations(ref,full_name,phone,email,voucher:sc_vouchers(code)))&order=period.desc&limit=60`);
        const [month] = await sel(`sc_registrations?campaign_id=eq.${cid}&select=id&limit=1`); // touch
        return res.status(200).json({ ok: true, rows, dti: camp.dti_permit || '', touched: !!month });
      }
      case 'eligible_count': {
        const { period } = body;
        const r = await fetch(`${SUPABASE_URL}/rest/v1/sc_registrations?campaign_id=eq.${cid}&disqualified=eq.false&select=id,created_at&limit=1`, { headers: { ...H, Prefer: 'count=exact' } });
        // precise per-period count done in draw; here approximate via rpc-free filter is complex — return total
        const total = parseInt((r.headers.get('content-range') || '/0').split('/')[1] || '0', 10);
        return res.status(200).json({ ok: true, period, total });
      }
      case 'draw': {
        const { period } = body;
        if (!/^\d{4}-\d{2}$/.test(String(period || ''))) return res.status(400).json({ ok: false, error: 'bad_period' });
        const out = await rpc('sc_draw', { p_period: period, p_actor: actor });
        return res.status(200).json(out);
      }
      case 'winner_status': {
        const { winner_id, status, notes, publish } = body;
        const patch = { updated_by: actor, updated_at: new Date().toISOString() };
        if (status) patch.status = status;
        if (typeof publish === 'boolean') patch.published = publish;
        if (notes !== undefined) patch.notes = String(notes || '');
        await write('PATCH', `sc_raffle_winners?id=eq.${winner_id}`, patch);
        await write('POST', 'sc_audit', { campaign_id: cid, actor, action: 'winner_status', detail: { winner_id, status, publish } });
        return res.status(200).json({ ok: true });
      }
      case 'redraw': {
        const { period, reason } = body;
        if (!reason) return res.status(400).json({ ok: false, error: 'reason_required' });
        const [rf] = await sel(`sc_raffles?campaign_id=eq.${cid}&period=eq.${encodeURIComponent(period)}&select=id`);
        if (!rf) return res.status(200).json({ ok: false, error: 'not_found' });
        // disqualify current winner records stay; reopen raffle for an audited redraw
        await write('PATCH', `sc_raffle_winners?raffle_id=eq.${rf.id}&status=neq.disqualified`, { status: 'disqualified', notes: `Redraw: ${reason}`, updated_by: actor, updated_at: new Date().toISOString() });
        await write('PATCH', `sc_raffles?id=eq.${rf.id}`, { status: 'open' });
        await write('POST', 'sc_audit', { campaign_id: cid, actor, action: 'redraw', detail: { period, reason } });
        return res.status(200).json({ ok: true });
      }
      case 'discounts': {
        const { q = '', limit = 200 } = body;
        let path = `sc_discounts?campaign_id=eq.${cid}&select=code,pct,status,redeemed_at,redeemed_by,order_ref,reg:sc_registrations(ref,full_name,voucher:sc_vouchers(code))&order=redeemed_at.desc.nullslast&limit=${Math.min(+limit || 200, 1000)}`;
        if (q) path += `&code=ilike.*${encodeURIComponent(String(q).replace(/[%*,()]/g, ''))}*`;
        return res.status(200).json({ ok: true, rows: await sel(path) });
      }
      case 'validate_discount': {
        const { code } = body;
        const rows = await sel(`sc_discounts?select=code,pct,status,reg:sc_registrations!inner(ref,full_name)&or=(code.ilike.${encodeURIComponent(String(code).trim())},reg.ref.ilike.${encodeURIComponent(String(code).trim())})&limit=1`).catch(() => []);
        const d = rows[0];
        if (!d) return res.status(200).json({ ok: false, error: 'not_found' });
        return res.status(200).json({ ok: true, code: d.code, pct: d.pct, status: d.status, ref: d.reg?.ref, name: d.reg?.full_name });
      }
      case 'redeem': {
        const { code, order_ref } = body;
        const out = await rpc('sc_redeem', { p_code: String(code || ''), p_order_ref: String(order_ref || ''), p_actor: actor });
        return res.status(200).json(out);
      }
      case 'unredeem': {
        const { code, reason } = body;
        const out = await rpc('sc_unredeem', { p_code: String(code || ''), p_actor: actor, p_reason: String(reason || '') });
        return res.status(200).json(out);
      }
      case 'partners': {
        return res.status(200).json({ ok: true, rows: await sel(`sc_partners?campaign_id=eq.${cid}&select=*&order=created_at.desc&limit=200`) });
      }
      case 'partner_save': {
        const { partner } = body;
        if (!partner?.name) return res.status(400).json({ ok: false, error: 'name_required' });
        const row = { campaign_id: cid, name: partner.name, contact_person: partner.contact_person || null, contact_number: partner.contact_number || null, location: partner.location || null, event_name: partner.event_name || null, status: partner.status || 'Active', collab_date: partner.collab_date || null };
        const out = partner.id
          ? await write('PATCH', `sc_partners?id=eq.${partner.id}`, row)
          : await write('POST', 'sc_partners', row);
        return res.status(200).json({ ok: true, row: Array.isArray(out) ? out[0] : out });
      }
      case 'content_get': {
        const content = await sel(`sc_content?campaign_id=eq.${cid}&select=key,value`);
        return res.status(200).json({ ok: true, content: Object.fromEntries(content.map(c => [c.key, c.value])), campaign: camp });
      }
      case 'content_set': {
        const { values = {}, dti_permit, ends_on } = body;
        for (const [k, v] of Object.entries(values)) {
          await fetch(`${SUPABASE_URL}/rest/v1/sc_content?on_conflict=campaign_id,key`, {
            method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ campaign_id: cid, key: k, value: String(v ?? ''), updated_at: new Date().toISOString() }),
          });
        }
        const patch = {};
        if (dti_permit !== undefined) patch.dti_permit = String(dti_permit || '') || null;
        if (ends_on) patch.ends_on = ends_on;
        if (Object.keys(patch).length) await write('PATCH', `sc_campaigns?id=eq.${cid}`, patch);
        await write('POST', 'sc_audit', { campaign_id: cid, actor, action: 'content_update', detail: { keys: Object.keys(values), dti: dti_permit !== undefined } });
        return res.status(200).json({ ok: true });
      }
      case 'audit':
        return res.status(200).json({ ok: true, rows: await sel(`sc_audit?campaign_id=eq.${cid}&order=id.desc&limit=200`) });
      default:
        return res.status(400).json({ error: 'unknown op' });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
