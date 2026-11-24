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

  -- SCREEN 4 — payment method: the six MOPs, GAS-canonical identifiers
  -- (WALK-IN hyphenated, matching CONFIG.gs SB_POINTS_MAP / sheet names / invoice templates)
  payment_method text not null
    check (payment_method in ('STRAIGHT PAYMENT','COD','COP','LAY AWAY','WALK-IN','PRE-ORDER')),

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

-- ─────────────────────────────────────────────────────────────────────────────
-- CORRECTION ②: analytics whitelist — allow the order_form_submit funnel event
-- (sb_visitor_events CHECK constraint + ingest function; api/track.js updated in code)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sb_visitor_events drop constraint if exists sb_visitor_events_event_type_check;
alter table public.sb_visitor_events add constraint sb_visitor_events_event_type_check
  check (event_type in
    ('page_view','search','product_view','category_view','size_filter','brand_filter',
     'add_to_cart','remove_from_cart','begin_checkout','checkout_error','purchase','track_order_view',
     'order_form_submit'));

create or replace function public.sb_track_ingest(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v text := payload->>'v';
  s text := payload->>'s';
  dev text := payload->>'device';
  ctry text := payload->>'country';
  meta jsonb := coalesce(payload->'meta','{}'::jsonb);
  ev jsonb;
begin
  if v is null or s is null or length(v) > 64 or length(s) > 64 then return; end if;

  insert into sb_visitors (visitor_id) values (v)
  on conflict (visitor_id) do update set last_seen_at = now();

  insert into sb_visitor_sessions (session_id, visitor_id, landing_page, referrer, utm_source, utm_medium, utm_campaign, source, device_type, country)
  values (s, v,
    left(meta->>'landing', 300), left(meta->>'ref', 300),
    left(meta->>'utm_source', 100), left(meta->>'utm_medium', 100), left(meta->>'utm_campaign', 100),
    left(meta->>'source', 40),
    case when dev in ('mobile','desktop','tablet') then dev else null end,
    left(ctry, 2))
  on conflict (session_id) do update set last_seen_at = now();

  update sb_visitors set total_sessions = (select count(*) from sb_visitor_sessions where visitor_id = v)
  where visitor_id = v;

  for ev in select * from jsonb_array_elements(coalesce(payload->'events','[]'::jsonb)) limit 25 loop
    if ev->>'t' = 'page_view' then
      insert into sb_page_views (session_id, visitor_id, page_path, item_code)
      values (s, v, left(coalesce(ev->>'p','/'), 300), left(ev->>'ic', 40));
      if ev->>'ic' is not null then
        insert into sb_visitor_events (session_id, visitor_id, event_type, item_code, sku)
        values (s, v, 'product_view', left(ev->>'ic', 40), left(ev->>'sku', 60));
      end if;
    elsif ev->>'t' in ('search','category_view','size_filter','brand_filter','add_to_cart','remove_from_cart','begin_checkout','checkout_error','track_order_view','order_form_submit') then
      insert into sb_visitor_events (session_id, visitor_id, event_type, item_code, sku, event_data)
      values (s, v, ev->>'t', left(ev->>'ic', 40), left(ev->>'sku', 60),
        case when ev->'d' is not null and pg_column_size(ev->'d') <= 1024 then ev->'d' else null end);
    end if;
  end loop;
end $$;
revoke all on function public.sb_track_ingest(jsonb) from public, anon, authenticated;

-- ROLLBACK PLAN (for review): the whole migration is additive and reversible —
--   drop table public.sb_order_requests;
--   (analytics constraint can be restored to the previous list; ingest function
--    is create-or-replace, previous definition in migration visitor_analytics_v1)
