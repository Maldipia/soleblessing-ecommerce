// Supabase REST client — no npm package needed
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://akualfrqzaierqsfcnkp.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const headers = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "Prefer": "return=representation",
});

export const sb = {
  async select(table: string, query = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? "?" + query : ""}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async insert(table: string, data: object) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(table: string, query: string, data: object) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(table: string, query: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
