
const SPREADSHEET_ID = '1WZttK5ZsPhnBz91JmBb-V4GCs-42uXjTUXz67V5sSDI';
const GID_2025 = '631652219';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parsePrice(str) {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[₱,\s]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function convertDriveUrl(url) {
  if (!url || !url.trim()) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`;
  return url; // CDN URLs returned as-is
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_2025}`;
    const response = await fetch(csvUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Sheet fetch failed: ${response.status}` });
    }

    const csvText = await response.text();
    const lines = csvText.split('\n').slice(2); // skip 2 header rows
    const products = [];
    const seen = new Set();

    for (const line of lines) {
      if (!line.trim()) continue;
      const row = parseCSVLine(line);
      if (row.length < 7) continue;

      const itemCode    = (row[0]  || '').trim();
      const details     = (row[1]  || '').trim();
      const sku         = (row[2]  || '').trim();
      const size        = (row[3]  || '').trim();
      const sellingPrice = row[5]  || '';
      const srp         = row[13] || '';
      const status      = (row[6]  || '').toUpperCase().trim();
      const driveUrl    = (row[18] || '').trim();

      if (!itemCode || !details) continue;
      if (!driveUrl) continue;           // must have image URL
      if (!size) continue;               // must have size
      const isSoldOut = status.includes('SOLD') || status === 'MISSING';
      if (isSoldOut) continue;
      const price = parsePrice(sellingPrice) || parsePrice(srp);
      if (!price) continue;

      if (seen.has(itemCode)) continue;
      seen.add(itemCode);

      products.push({
        itemCode,
        name: details,
        sku,
        size,
        sellingPrice: parsePrice(sellingPrice),
        srp: parsePrice(srp),
        status,
        imageUrl: convertDriveUrl(driveUrl),
        productsUrl: driveUrl,
        discount: (() => {
          const s = parsePrice(srp);
          const p = parsePrice(sellingPrice);
          if (!s || !p || p >= s) return 0;
          return Math.round(((s - p) / s) * 100);
        })(),
      });
    }

    res.status(200).json({ products, count: products.length, tab: '2025', cached: false });

  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
