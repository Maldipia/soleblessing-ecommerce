-- SoleBlessing Phase 2 — OPTIONAL server-side draft storage (v2)
-- PREPARED FOR REVIEW — NOT APPLIED. Apply only after Pia's explicit approval.
--
-- Phase 2 works WITHOUT this migration: encoding drafts are kept per-request in
-- the admin's browser storage. This migration upgrades drafts to the database so
-- they survive across devices/browsers and record who prepared them.
-- Additive only; single transaction; idempotent (rerunnable).

alter table public.sb_order_requests
  add column if not exists draft jsonb,                 -- {cust, pm, shipFee, discount, lines}
  add column if not exists draft_updated_at timestamptz,
  add column if not exists prepared_by text;            -- admin actor who last saved the draft

-- ROLLBACK:
--   alter table public.sb_order_requests
--     drop column if exists draft,
--     drop column if exists draft_updated_at,
--     drop column if exists prepared_by;
