// Anonymous visitor analytics — batched, fire-and-forget, never blocks the UI.
// visitor_id: random token in localStorage; session_id: random token in sessionStorage.
// No cookies, no PII, no fingerprinting. Events flush every 5s and on page hide
// via sendBeacon, so page speed is untouched.

type Ev = { t: string; p?: string; ic?: string; sku?: string; d?: Record<string, unknown> };

const rid = () => {
  try { return crypto.randomUUID().replace(/-/g, "").slice(0, 24); }
  catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
};

const get = (st: Storage, k: string): string => {
  try {
    let v = st.getItem(k);
    if (!v) { v = rid(); st.setItem(k, v); }
    return v;
  } catch { return "anon-" + rid(); }
};

let visitorId = "", sessionId = "", isNewSession = false;
try {
  try { isNewSession = !sessionStorage.getItem("sb_sid"); } catch {}
  visitorId = get(localStorage, "sb_vid");
  sessionId = get(sessionStorage, "sb_sid");
} catch { visitorId = "anon-" + rid(); sessionId = "s-" + rid(); }

function sourceOf(ref: string, utm: string): string {
  const r = (utm || ref || "").toLowerCase();
  if (!r) return "direct";
  if (r.includes("facebook") || r.includes("fb.") || r === "fb") return "facebook";
  if (r.includes("instagram") || r === "ig") return "instagram";
  if (r.includes("google")) return "google";
  if (r.includes("tiktok")) return "tiktok";
  if (utm) return utm.slice(0, 40);
  return "referral";
}

let meta: Record<string, string> | undefined;
if (isNewSession) {
  try {
    const sp = new URLSearchParams(location.search);
    const ref = document.referrer && !document.referrer.includes(location.hostname) ? document.referrer : "";
    meta = {
      landing: location.pathname,
      ref,
      utm_source: sp.get("utm_source") || "",
      utm_medium: sp.get("utm_medium") || "",
      utm_campaign: sp.get("utm_campaign") || "",
      source: sourceOf(ref, sp.get("utm_source") || ""),
    };
  } catch {}
}

let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!queue.length) return;
  const batch = queue.splice(0, 25);
  const body = JSON.stringify({ v: visitorId, s: sessionId, m: meta, e: batch });
  meta = undefined; // only first batch of the session carries attribution
  try {
    if (navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  try { fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {}); } catch {}
}

// Staff/bot guard (same rules as the Metricool tracker): automated browsers
// (navigator.webdriver — bots/tests) and any browser that has ever logged into
// the admin (sb_owner, set on admin auth) are never counted. Checked per event
// so logging in mid-session mutes immediately.
const isMuted = () => {
  try { return !!(navigator as any).webdriver || localStorage.getItem("sb_owner") === "1"; }
  catch { return false; }
};

export function track(t: string, extra: Omit<Ev, "t"> = {}) {
  try {
    if (isMuted()) return;
    if (typeof extra.p === "string" && extra.p.startsWith("/admin")) return;
    queue.push({ t, ...extra });
    if (queue.length >= 20) flush();
    else if (!timer) timer = setTimeout(flush, 5000);
  } catch {}
}

export const trackIds = () => ({ visitor_id: visitorId, session_id: sessionId });

try {
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
} catch {}
