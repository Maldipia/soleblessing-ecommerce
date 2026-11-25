// ONE shared service for turning a customer form submission into an order.
// Used by api/submit-order-request.js (the generated /order link) — and by any
// future entry point (another form, a Messenger bot) so order-creation logic
// never forks. Entry points differ; the business logic lives here once.
//
// Behavior = identical to an FB Form order: source 'sheet_import' (same badges,
// stats, stock-trigger exemption, edit → invoice → payment flow), ₱0 totals
// until the admin encodes items, PRE-ORDER starts awaiting_full_payment.
// No stock, no loyalty, no GAS at creation. Source attribution is preserved
// through the linked sb_order_requests row (request_ref ↔ order_number) and
// the audit entry's request_ref/source tag.
import { logOrderEvent } from './auth.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const H = () => ({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' });

/**
 * Create the FB-Form-style order for a form submission and link its request.
 * `out`: validated submission fields; `requestRef`: RQ-…; `entry`: attribution
 * tag for the audit trail ('order_form' for the generated link).
 * Best-effort: returns the order row, or null (request stays saved for recovery).
 */
export async function createFormOrder(out, requestRef, entry = 'order_form') {
  const shipping_address = [out.address, out.city, out.region].filter(Boolean).join(', ');
  for (let i = 0; i < 3; i++) {
    const order_number = `SB-${String(Math.floor(1e9 + Math.random() * 9e9))}`;
    try {
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/sb_orders`, {
        method: 'POST', headers: { ...H(), Prefer: 'return=representation' },
        body: JSON.stringify({
          order_number,
          customer_name: out.receiver_name, facebook_name: out.fb_ig_name || null,
          customer_email: out.email || null, contact_number: out.contact_number,
          shipping_address, region: out.region || null, city: out.city || null,
          notes: out.special_request || null,
          items: [], subtotal: 0, shipping_fee: 0, discount_amount: 0, total: 0,
          payment_method: out.payment_method, status: 'pending',
          payment_status: out.payment_method === 'PRE-ORDER' ? 'awaiting_full_payment' : 'pending',
          source: 'sheet_import',
        }),
      });
      if (ins.ok) {
        const order = (await ins.json())[0];
        await fetch(`${SUPABASE_URL}/rest/v1/sb_order_requests?request_ref=eq.${encodeURIComponent(requestRef)}`, {
          method: 'PATCH', headers: H(),
          body: JSON.stringify({ status: 'converted', converted_order_number: order.order_number }),
        }).catch(() => {});
        await logOrderEvent({ order_number: order.order_number, actor: 'customer', action: 'create',
          new_value: { source: entry, request_ref: requestRef, payment_method: out.payment_method, total: 0 } });
        return order;
      }
      const txt = await ins.text();
      if (!/duplicate key|23505/.test(txt)) return null;
    } catch { return null; }
  }
  return null;
}
