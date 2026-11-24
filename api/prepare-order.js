// Admin-only: convert an sb_order_requests row (native /order form submission)
// into a real sb_orders order, after the admin encodes products in the
// Create Order modal.
//
// Safety model:
//  * owner/manager token required (scanner PINs rejected)
//  * ATOMIC CLAIM on the request row (conditional PATCH where not yet
//    converted) — duplicate conversion is impossible, even on double-click
//    or two admins racing
//  * non-PRE-ORDER MOPs reuse the FULL existing /api/place-order pipeline
//    unchanged: atomic stock deduction, loyalty per existing config, GAS
//    sheet mirror, auto-invoice, order-received email
//  * PRE-ORDER creates the order directly: payment_status
//    'awaiting_full_payment', NO GAS mirror (a PRE-ORDER through the GAS
//    webhook would misroute to the COD sheet), ZERO loyalty points, and no
//    stock deduction (pre-order items are not in stock)
//  * audit: 'request_convert' entry keyed by the request_ref + the usual
//    order 'create' entry; reviewed_by stamped with the admin actor
import { cors, verifyCredential, isOwnerOrManager, logOrderEvent } from '../server/auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = () => ({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' });

const GAS_MOPS = ['STRAIGHT PAYMENT', 'COD', 'COP', 'LAY AWAY', 'WALK-IN', 'PRE-ORDER'];
const LEGACY_MOPS = ['cod', 'gcash', 'maya', 'bdo', 'bpi', 'bank'];

const newOrderNumber = () => `SB-${String(Math.floor(1e9 + Math.random() * 9e9))}`;

// A claim older than this is considered abandoned (the function died mid-run)
// and may be recovered. A fresh claim is NEVER cleared or taken over.
const STALE_CLAIM_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  cors(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const cred = await verifyCredential({ password: body && body.password, token: body && body.token });
  if (!isOwnerOrManager(cred)) return res.status(401).json({ error: 'unauthorized' });
  const actor = cred.kind === 'owner' ? 'OWNER' : (cred.staff && cred.staff.id) || 'STAFF';

  const requestRef = String(body.request_ref || '').trim();
  const od = body.orderData || {};
  if (!/^RQ-\d{8}-\d{4}$/.test(requestRef)) return res.status(400).json({ error: 'valid request_ref required' });
  const items = Array.isArray(od.items) ? od.items.filter((i) => i && String(i.name || '').trim() && (i.price | 0) > 0) : [];
  if (!items.length) return res.status(400).json({ error: 'at least one item with a name and price is required' });
  if (!String(od.customer_name || '').trim()) return res.status(400).json({ error: 'customer name required' });
  const pmRaw = String(od.payment_method || '').trim();
  const pmUpper = pmRaw.toUpperCase();
  const isGasMop = GAS_MOPS.includes(pmUpper);
  if (!isGasMop && !LEGACY_MOPS.includes(pmRaw.toLowerCase()))
    return res.status(400).json({ error: 'invalid payment method' });
  const paymentMethod = isGasMop ? pmUpper : pmRaw.toLowerCase();
  const isPreorder = pmUpper === 'PRE-ORDER';

  try {
    // ── 1. ATOMIC CLAIM — only a request that has never been converted and is
    //       still new / in_review can be claimed. 0 rows back = already taken.
    const claim = await fetch(
      `${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}` +
      `&converted_order_number=is.null&status=in.(new,in_review)`,
      {
        method: 'PATCH',
        headers: { ...H(), Prefer: 'return=representation' },
        body: JSON.stringify({ converted_order_number: 'CONVERTING', reviewed_by: actor, reviewed_at: new Date().toISOString() }),
      },
    );
    const claimed = claim.ok ? await claim.json() : [];
    let request = claimed[0] || null;
    if (!request) {
      // Why not? Inspect the row and, for an ABANDONED claim, recover safely.
      const q = await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}&select=status,converted_order_number,reviewed_at`, { headers: H() });
      const row = q.ok ? (await q.json())[0] : null;
      if (!row) return res.status(404).json({ error: 'request not found' });
      if (row.converted_order_number && row.converted_order_number !== 'CONVERTING')
        return res.status(409).json({ error: `already converted to ${row.converted_order_number}`, order_number: row.converted_order_number });

      if (row.converted_order_number === 'CONVERTING') {
        const age = Date.now() - new Date(row.reviewed_at || 0).getTime();
        if (!(age >= STALE_CLAIM_MS))
          return res.status(409).json({ error: 'conversion already in progress — try again in a few minutes' });

        // STALE CLAIM (≥10 min): the previous attempt died mid-run.
        // 1) Orphan check FIRST — if that attempt already created the order,
        //    finalize the linkage instead of ever creating a second order
        //    (this is also what makes duplicate PRE-ORDER conversion impossible).
        const oq = await fetch(
          `${SUPABASE_URL}/rest/v1/sb_orders?notes=ilike.${encodeURIComponent('*From order request ' + requestRef + '*')}&select=order_number,invoice_url,payment_method&limit=1`,
          { headers: H() },
        );
        const orphan = oq.ok ? (await oq.json())[0] : null;
        if (orphan) {
          await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}&converted_order_number=eq.CONVERTING`, {
            method: 'PATCH', headers: H(),
            body: JSON.stringify({ status: 'converted', converted_order_number: orphan.order_number, reviewed_by: actor, reviewed_at: new Date().toISOString() }),
          });
          logOrderEvent({ order_number: requestRef, actor, action: 'request_convert',
            old_value: { status: row.status, stale_claim: true },
            new_value: { status: 'converted', converted_order_number: orphan.order_number, recovered_orphan: true } });
          return res.status(200).json({ ok: true, order_number: orphan.order_number, invoice_url: orphan.invoice_url || null,
            preorder: String(orphan.payment_method || '').toUpperCase() === 'PRE-ORDER', recovered: true });
        }
        // 2) No order was created — take over the stale claim, atomically
        //    (the reviewed_at guard means a FRESH claim can never be taken).
        const cutoff = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
        const tk = await fetch(
          `${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}&converted_order_number=eq.CONVERTING&reviewed_at=lt.${encodeURIComponent(cutoff)}`,
          { method: 'PATCH', headers: { ...H(), Prefer: 'return=representation' },
            body: JSON.stringify({ reviewed_by: actor, reviewed_at: new Date().toISOString() }) },
        );
        const took = tk.ok ? await tk.json() : [];
        if (!took.length) return res.status(409).json({ error: 'conversion already in progress — try again in a few minutes' });
        request = took[0];
      } else {
        return res.status(409).json({ error: `request is ${row.status} — cannot convert` });
      }
    }

    const release = () =>
      fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}&converted_order_number=eq.CONVERTING`, {
        method: 'PATCH', headers: H(), body: JSON.stringify({ converted_order_number: null }),
      }).catch(() => {});

    // ── 2. Build the order payload (customer data comes from the admin's modal,
    //       prefilled from the request; linkage note keeps the ref on the order)
    const orderNumber = newOrderNumber();
    const note = [String(od.notes || '').trim(), `From order request ${requestRef}`].filter(Boolean).join(' · ');
    const orderData = {
      order_number: orderNumber,
      customer_name: String(od.customer_name || '').trim(),
      facebook_name: String(od.facebook_name || '').trim() || null,
      customer_email: String(od.customer_email || '').trim(),
      contact_number: String(od.contact_number || '').trim(),
      shipping_address: String(od.shipping_address || '').trim(),
      region: String(od.region || '').trim(), city: String(od.city || '').trim(),
      notes: note,
      items,
      subtotal: od.subtotal | 0, shipping_fee: od.shipping_fee | 0,
      discount_amount: od.discount_amount | 0, total: od.total | 0,
      payment_method: paymentMethod, source: 'manual',
    };

    let order = null;
    if (isPreorder) {
      // ── 3a. PRE-ORDER: direct insert. No stock move, no loyalty, no GAS.
      // INVENTORY PROTECTION: the cancel/un-cancel stock trigger matches lines
      // by items[].id against sb_inventory.item_code. PRE-ORDER never deducted
      // stock, so its lines must never carry a live code there — otherwise a
      // later cancellation would phantom-RESTOCK a pair that was never taken.
      // The REAL code is preserved in preorder_item_code (and sku stays as
      // encoded) for Phase 3: after payment verification, a confirm step can
      // atomically deduct stock using preorder_item_code, then clear it.
      orderData.items = items.map((it) => {
        const orig = String(it.id || '').trim();
        return orig && orig.toUpperCase() !== 'PO'
          ? { ...it, id: 'PO', preorder_item_code: orig }
          : { ...it, id: 'PO' };
      });
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders`, {
        method: 'POST', headers: { ...H(), Prefer: 'return=representation' },
        body: JSON.stringify({ ...orderData, status: 'pending', payment_status: 'awaiting_full_payment' }),
      });
      if (!ins.ok) { await release(); return res.status(502).json({ error: 'order insert failed: ' + (await ins.text()).slice(0, 200) }); }
      order = (await ins.json())[0];
      logOrderEvent({ order_number: orderNumber, actor, action: 'create',
        new_value: { total: order.total, items: items.length, payment_method: paymentMethod, source: 'manual', preorder: true } });
    } else {
      // ── 3b. Everything else: the existing place-order pipeline, unchanged.
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const r = await fetch(`https://${host}/api/place-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderData }),
      });
      const out = await r.json().catch(() => ({}));
      if (!r.ok || !out.order) {
        await release();
        if (r.status === 409 && out.error === 'out_of_stock') return res.status(409).json({ error: 'out_of_stock', item_code: out.item_code });
        return res.status(502).json({ error: out.error || 'order creation failed' });
      }
      order = out.order;
    }

    // ── 4. Finalize the claim: converted + real order number.
    await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}`, {
      method: 'PATCH', headers: H(),
      body: JSON.stringify({ status: 'converted', converted_order_number: order.order_number }),
    });

    logOrderEvent({ order_number: requestRef, actor, action: 'request_convert',
      old_value: { status: request.status },
      new_value: { status: 'converted', converted_order_number: order.order_number, payment_method: paymentMethod, total: orderData.total } });

    return res.status(200).json({ ok: true, order_number: order.order_number, invoice_url: order.invoice_url || null, preorder: isPreorder });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
