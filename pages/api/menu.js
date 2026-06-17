import { getMenuItems } from '../../lib/sheets';

let cached = null;
let cachedAt = 0;
const TTL = 60_000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  try {
    const now = Date.now();
    if (!cached || now - cachedAt > TTL) {
      cached = await getMenuItems();
      cachedAt = now;
    }
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json(cached);
  } catch (err) {
    console.error('Menu API error:', err.message);
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
      res.status(200).json(cached);
      return;
    }
    res.status(500).json({ error: err.message });
  }
}