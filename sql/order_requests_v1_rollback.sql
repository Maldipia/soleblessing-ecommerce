-- ROLLBACK for order_requests_v1 — fully executable, restores exact pre-migration state.
-- Safe to run whether or not the forward migration completed fully (IF EXISTS guards).

begin;

-- 1. Drop the new table (additive object; nothing references it)
drop table if exists public.sb_order_requests;

-- 2. Restore the EXACT original analytics CHECK constraint (12 event types,
--    captured from production pg_get_constraintdef on 2026-11-24)
alter table public.sb_visitor_events drop constraint if exists sb_visitor_events_event_type_check;
alter table public.sb_visitor_events add constraint sb_visitor_events_event_type_check
  check (event_type in
    ('page_view','search','product_view','category_view','size_filter','brand_filter',
     'add_to_cart','remove_from_cart','begin_checkout','checkout_error','purchase','track_order_view'));

-- 3. Restore the EXACT original sb_track_ingest (captured from production
--    pg_get_functiondef on 2026-11-24; only diff vs proposed is the event list)
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
    elsif ev->>'t' in ('search','category_view','size_filter','brand_filter','add_to_cart','remove_from_cart','begin_checkout','checkout_error','track_order_view') then
      insert into sb_visitor_events (session_id, visitor_id, event_type, item_code, sku, event_data)
      values (s, v, ev->>'t', left(ev->>'ic', 40), left(ev->>'sku', 60),
        case when ev->'d' is not null and pg_column_size(ev->'d') <= 1024 then ev->'d' else null end);
    end if;
  end loop;
end $$;

-- 4. Restore permission posture (same revokes as the original migration;
--    create-or-replace preserves ACLs, this makes the state explicit)
revoke all on function public.sb_track_ingest(jsonb) from public, anon, authenticated;

commit;

-- NOTE: any order_form_submit rows already inserted while the forward migration
-- was live would violate the restored constraint. If such rows exist, run FIRST:
--   delete from public.sb_visitor_events where event_type = 'order_form_submit';
-- (Pre-checked 2026-11-24: zero such rows exist today.)
