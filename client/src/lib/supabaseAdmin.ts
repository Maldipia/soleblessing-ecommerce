// sbAdmin — same interface as `sb`, but routes privileged operations through the
// credential-gated /api/admin endpoint (service role server-side).
//
// P1 session hardening: login now returns a SIGNED 7-DAY SESSION TOKEN, and that
// token — not the password — is what the browser stores and sends. Sessions from
// before this change still have the old stored password; it keeps working as a
// fallback until their next login, which upgrades them to a token.
const PW_KEY = 'sb_admin_pw';
const TOKEN_KEY = 'sb_admin_token';
const getPw = () => { try { return localStorage.getItem(PW_KEY) || sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; } };
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };

// Credential fields for any admin-gated API body: token when we have one,
// legacy password otherwise. Spread it: { ...adminCred(), ...rest }
export const adminCred = (): Record<string, string> => {
  const t = getToken();
  return t ? { token: t } : { password: getPw() };
};

async function call(op: string, table: string, query = '', data?: object) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...adminCred(), op, table, query, data }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const sbAdmin = {
  // Verify password server-side against ADMIN_PASSWORD; store it on success.
  async authenticate(password: string): Promise<boolean> {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, op: 'auth' }),
      });
      if (!res.ok) return false;
      const out = await res.json().catch(() => ({} as any));
      try {
        // P1: store the session token, NOT the password. Clear any password a
        // previous version of the app left behind.
        for (const st of [localStorage, sessionStorage]) {
          if (out.token) st.setItem(TOKEN_KEY, out.token);
          st.removeItem(PW_KEY);
          st.setItem('sb_admin_role', out.role || 'OWNER');
          st.setItem('sb_admin_color', out.color || '#C9A84C');
        }
        // Legacy server without token support: fall back to the old behavior
        // so login never bricks mid-deploy.
        if (!out.token) { localStorage.setItem(PW_KEY, password); sessionStorage.setItem(PW_KEY, password); }
      } catch {}
      return true;
    } catch { return false; }
  },
  // Visitor analytics summary (owner/manager). from/to are ISO strings.
  async analytics(from: string, to: string, rollup = false) {
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...adminCred(), op: 'analytics', from, to, rollup }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  select: (table: string, query = '') => call('select', table, query),
  insert: (table: string, data: object) => call('insert', table, '', data),
  upsert: (table: string, query: string, data: object) => call('upsert', table, query, data),
  update: (table: string, query: string, data: object) => call('update', table, query, data),
  delete: (table: string, query: string) => call('delete', table, query),
};
