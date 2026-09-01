import { getShowcaseItems } from '../../lib/showcase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const items = await getShowcaseItems();
    return res.status(200).json({ items });
  } catch (e) {
    console.error('[showcase] GET error:', e);
    return res.status(500).json({ items: [] });
  }
}
