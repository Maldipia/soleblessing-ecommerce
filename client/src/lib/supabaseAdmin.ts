// sbAdmin — same interface as `sb`, but routes privileged operations through the
// password-gated /api/admin endpoint (service role server-side). The password is
// captured at login (verified server-side) and held in sessionStorage.
const PW_KEY = 'sb_admin_pw';
const getPw = () => { try { return sessionStorage.getItem(PW_KEY) || ''; } catch { return ''; } };

async function call(op: string, table: string, query = '', data?: object) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: getPw(), op, table, query, data }),
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
      try { sessionStorage.setItem(PW_KEY, password); } catch {}
      return true;
    } catch { return false; }
  },
  select: (table: string, query = '') => call('select', table, query),
  insert: (table: string, data: object) => call('insert', table, '', data),
  update: (table: string, query: string, data: object) => call('update', table, query, data),
  delete: (table: string, query: string) => call('delete', table, query),
};
