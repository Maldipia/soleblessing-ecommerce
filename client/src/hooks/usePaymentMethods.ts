// Single source of truth for payment accounts.
// Reads sb_settings.payment_methods (Supabase). NEVER hardcode accounts anywhere else —
// the admin Dashboard → Settings → Payment Methods tab is the only place these are edited.
//
// NOTE: sb_settings.value is a `text` column (not jsonb), so it MUST be JSON.parse'd on read.
import { useState, useEffect } from "react";
import { sb } from "@/lib/supabase";

export type PaymentMethod = {
  id: string;
  type?: string;              // "ewallet" | "bank" | "cod"
  label: string;              // "GCash", "Union Bank"
  account_name?: string;      // "Legeryn Pia"
  account_number?: string;    // "0966 960 6060"
  detail?: string;            // "Legeryn Pia — 0966 960 6060"
  enabled: boolean;
  icon?: string;
};

/** Digits only — for clipboard copy. */
export const digitsOnly = (v?: string) => (v || "").replace(/\D/g, "");

/** Masked display, e.g. "•••• 6060". */
export const maskAccount = (v?: string) => {
  const d = digitsOnly(v);
  return d ? "•••• " + d.slice(-4) : "";
};

/** Masked holder name, e.g. "LE****N P." */
export const maskName = (v?: string) => {
  const parts = (v || "").trim().split(/\s+/);
  if (!parts[0]) return "";
  const first = parts[0];
  const head = first.slice(0, 2).toUpperCase();
  const tail = first.slice(-1).toUpperCase();
  const last = parts.length > 1 ? " " + parts[parts.length - 1][0].toUpperCase() + "." : "";
  return `${head}****${tail}${last}`;
};

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await sb.select("sb_settings", "select=key,value&key=eq.payment_methods");
        const raw = rows?.[0]?.value;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!alive) return;
        setMethods(Array.isArray(parsed) ? parsed.filter((m: any) => m && m.enabled) : []);
      } catch (e: any) {
        if (!alive) return;
        // Deliberately NO hardcoded fallback: showing a stale/wrong account is worse
        // than showing none. The UI renders a "contact us" notice instead.
        setError(String(e?.message || e));
        setMethods([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const banks    = methods.filter(m => m.type === "bank");
  const ewallets = methods.filter(m => m.type === "ewallet");

  return { methods, banks, ewallets, loading, error };
}
