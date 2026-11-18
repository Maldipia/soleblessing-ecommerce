-- P0.3 — FB sheet orders must NOT move stock on cancel / un-cancel.
-- Sheet-import orders never decremented stock at creation (they were imported,
-- not placed through sb_place_order), so restocking them on 'cancelled' marks
-- pairs Available that were never taken — stock corruption. The admin delete
-- path already guards this in the UI; this fixes it at the source of truth so
-- the status dropdown, API calls and any future path are all covered.
-- Website and manual orders (which DO decrement at placement) keep their
-- existing restock-on-cancel / re-decrement-on-uncancel behavior unchanged.
CREATE OR REPLACE FUNCTION public.sb_order_status_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE it jsonb; v_qty int;
BEGIN
  -- Sheet-import orders never touched stock, so their status changes must not either.
  IF COALESCE(NEW.source, 'website') = 'sheet_import' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items,'[]'::jsonb)) LOOP
      v_qty := GREATEST(COALESCE((it->>'qty')::int,1),1);
      UPDATE public.sb_inventory SET stock = stock + v_qty WHERE item_code = it->>'id';
    END LOOP;
  ELSIF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(OLD.items,'[]'::jsonb)) LOOP
      v_qty := GREATEST(COALESCE((it->>'qty')::int,1),1);
      UPDATE public.sb_inventory SET stock = GREATEST(stock - v_qty, 0) WHERE item_code = it->>'id';
    END LOOP;
  END IF;
  RETURN NEW;
END $function$;
