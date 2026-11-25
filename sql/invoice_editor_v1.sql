-- invoice_editor_v1 — optional editable invoice number for the native invoice
-- editor. PREPARED, NOT APPLIED. The editor works without it (falls back to
-- the order number); applying this just makes the Invoice No. field editable.
-- Rollback: alter table public.sb_orders drop column if exists invoice_no;
alter table public.sb_orders add column if not exists invoice_no text;
