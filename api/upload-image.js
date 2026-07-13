// Product photo upload — gated by ADMIN_PASSWORD. Stores in the product-images
// bucket keyed by item_code and upserts product_image_cache so the exact product
// row shows the exact photo. Service key never reaches the browser.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://akualfrqzaierqsfcnkp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SERVICE_KEY) return res.status(500).json({ error: 'service key missing' });
  if (!ADMIN_PASSWORD) return res.status(500).json({ error: 'admin password not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { password, item_code, sku = '', content_type = 'image/jpeg', base64 } = body || {};

  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
  if (!item_code || !/^[A-Za-z0-9_-]{1,32}$/.test(item_code)) return res.status(400).json({ error: 'bad item_code' });
  if (!base64) return res.status(400).json({ error: 'missing image data' });
  if (!/^image\/(jpeg|png|webp)$/.test(content_type)) return res.status(400).json({ error: 'jpeg/png/webp only' });

  try {
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'max 5MB' });

    const ext = content_type === 'image/png' ? 'png' : content_type === 'image/webp' ? 'webp' : 'jpg';
    const path = `products/${item_code}.${ext}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': content_type,
        'x-upsert': 'true',
      },
      body: buf,
    });
    if (!up.ok) return res.status(502).json({ error: await up.text() });

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}?v=${Date.now()}`;

    const cache = await fetch(`${SUPABASE_URL}/rest/v1/product_image_cache?on_conflict=item_code`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        item_code, sku,
        supabase_url: publicUrl,
        file_size: buf.length,
        sync_status: 'OK',
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!cache.ok) return res.status(502).json({ error: await cache.text() });

    return res.status(200).json({ ok: true, url: publicUrl });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
