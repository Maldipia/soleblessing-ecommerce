-- SoleBlessing — secure customer invoice links (v1)
-- PREPARED FOR REVIEW — NOT APPLIED. Apply only after Pia's explicit approval.
-- Additive only; single transaction; idempotent (rerunnable).
--
-- Purpose: the customer receives /invoice/t/<token> (default 7-day access).
-- Expiry/revocation kills CUSTOMER access only — the order, invoice data,
-- payment records and history stay in the dashboard permanently. Admin can
-- extend or reissue; every action is audited in sb_order_log.

create table if not exists public.sb_invoice_tokens (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  token text unique not null,                    -- 32-byte random, base64url
  issued_by text not null,                       -- admin actor
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,               -- default: issued_at + 7 days
  extended_at timestamptz,                       -- last extension
  extended_by text,
  revoked_at timestamptz,                        -- set on revoke / reissue
  revoked_by text
);

create index if not exists idx_invtok_order on public.sb_invoice_tokens (order_number, issued_at desc);

-- RLS: locked. Zero policies — only the service role (server APIs) reads/writes.
alter table public.sb_invoice_tokens enable row level security;

-- ROLLBACK:
--   drop table if exists public.sb_invoice_tokens;
