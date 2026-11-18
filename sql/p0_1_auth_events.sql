-- P0.1 — durable auth-attempt log for /api/admin rate limiting.
-- WHY A NEW TABLE (per implementation rules, explained before applying):
-- Vercel serverless instances don't share memory, so a purely in-memory rate
-- limit resets on every cold start and is split across instances (easily
-- bypassed by volume). The only shared store in this stack is Supabase.
-- This table also satisfies "record authentication failures securely":
-- RLS is enabled with no policies, so ONLY the service role can read/write it.
create table if not exists public.sb_auth_events (
  id bigint generated always as identity primary key,
  ip text not null,
  ok boolean not null,
  role text,
  op text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sb_auth_events_ip_time
  on public.sb_auth_events (ip, created_at desc);
alter table public.sb_auth_events enable row level security;
