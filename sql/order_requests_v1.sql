-- SoleBlessing Native Order Form — sb_order_requests (v1)
-- PREPARED FOR REVIEW — NOT APPLIED. Apply only after Pia's explicit approval.
-- Additive only: no existing table, trigger, or policy is modified.

create table if not exists public.sb_order_requests (
  id uuid primary key default gen_random_uuid(),
  request_ref text unique not null,                  -- RQ-YYYYMMDD-XXXX (server-generated, collision-retried)
  submission_id text unique,                         -- client idempotency key (uuid) — duplicate POSTs return the same ref
  status text not null default 'new'
    check (status in ('new','in_review','invoiced','converted','rejected','expired')),

  -- SCREEN 2 — customer information (GAS cols B, D, L, E, G preserved)
  email text not null,
  fb_ig_name text not null,
  vip_id text,                                       -- optional; links to existing sb_loyalty
  receiver_name text not null,
  contact_number text not null,

  -- SCREEN 3 — delivery information (GAS cols J, K, F, I preserved)
  region text not null,
  city text not null,
  address text not null,
  special_request text,

  -- SCREEN 4 — payment method: the six live MOPs (GAS sheet-mapping compatible)
  payment_method text not null
    check (payment_method in ('STRAIGHT PAYMENT','COD','COP','LAY AWAY','WALK IN','PRE-ORDER')),

  -- policy acceptances (server-stamped)
  privacy_policy_version text not null,
  privacy_accepted_at timestamptz not null default now(),
  preorder_policy_version text,                      -- set only when payment_method = PRE-ORDER
  preorder_accepted_at timestamptz,                  -- required for PRE-ORDER (enforced in API + check below)
  constraint preorder_needs_acceptance
    check (payment_method <> 'PRE-ORDER' or (preorder_policy_version is not null and preorder_accepted_at is not null)),

  -- kept for GAS-compat (not on the form; admin/loyalty use later)
  raffle_entry boolean,

  source text not null default 'order_form',
  utm jsonb,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  converted_order_number text,                       -- set when admin converts to sb_orders
  admin_notes text
);

create index if not exists idx_req_status_created on public.sb_order_requests (status, created_at desc);
create index if not exists idx_req_contact on public.sb_order_requests (contact_number);
create index if not exists idx_req_created on public.sb_order_requests (created_at);

-- RLS: locked. Zero policies — only the service role (server APIs) reads/writes.
alter table public.sb_order_requests enable row level security;

-- NOTES (enforced in API/server code, documented here):
-- * Loyalty points are NOT awarded at submission. Award happens server-side at
--   conversion to sb_orders, using the fixed map:
--   STRAIGHT PAYMENT=100, COD=50, COP=50, LAY AWAY=25, WALK IN=75, PRE-ORDER=0.
--   Frontend-supplied points/status are never trusted.
-- * The original submission row is immutable in practice: admin edits happen on
--   the converted sb_orders record (existing OrderEditModal + sb_order_log audit);
--   only status / reviewed_* / converted_order_number / admin_notes change here.
-- * PRE-ORDER orders convert with payment_status 'awaiting_full_payment' and are
--   never auto-marked paid or confirmed.
