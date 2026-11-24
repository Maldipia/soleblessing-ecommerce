# Phase 3 design — PRE-ORDER stock deduction after payment verification

**Status: DESIGN ONLY — nothing here is implemented or applied.**

## Current state (Phase 2)

A PRE-ORDER conversion stores every line with `items[].id = 'PO'` and keeps the
real inventory code (when the admin encoded one) in `items[].preorder_item_code`.
SKU / size / price stay exactly as encoded.

Why: the cancel/un-cancel trigger (`sb_order_status_stock`) moves stock by
matching `items[].id` against `sb_inventory.item_code`. PRE-ORDER never deducted
stock at creation, so its lines must never match a live code — `'PO'` matches
nothing, making phantom restock on cancellation structurally impossible, in both
directions (cancel and un-cancel are both no-ops).

Trade-off (documented, accepted for v1): an in-stock pair encoded under
PRE-ORDER stays sellable on the website until payment is verified.

## Phase 3: `sb_confirm_preorder(p_order_number text)`

A SECURITY DEFINER function mirroring `sb_place_order`'s own stock pattern,
called by a new admin-gated endpoint when the admin marks the payment VERIFIED:

1. Load the order; require `payment_method = 'PRE-ORDER'` and
   `payment_status = 'awaiting_full_payment'` (idempotency guard — a second
   call is a no-op, so no double deduction).
2. For each line with a `preorder_item_code`:
   `UPDATE sb_inventory SET stock = stock - qty
    WHERE sb_norm_code(item_code) = sb_norm_code(preorder_item_code) AND stock >= qty;`
   `IF NOT FOUND → RAISE 'OUT_OF_STOCK:<code>'` → whole transaction rolls back,
   admin gets a clear error and resolves manually (item sold meanwhile).
3. On success, rewrite each deducted line: `id := preorder_item_code`,
   remove `preorder_item_code`. From this moment the existing cancel trigger
   handles restocking CORRECTLY (stock was really taken).
4. Set `payment_status = 'verified'`, stamp `updated_at`; endpoint writes an
   `sb_order_log` entry (`preorder_confirmed`, actor, deducted codes).
5. Loyalty: per business rule PRE-ORDER earns ZERO points — the function never
   touches `sb_loyalty`.

Lines that never had a real code (true pre-orders from the supplier) keep
`id = 'PO'` forever and never move stock.
