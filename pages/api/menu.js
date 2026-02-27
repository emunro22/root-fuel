import { getMenuItems } from '../../lib/sheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  try {
    const items = await getMenuItems();
    res.status(200).json(items);
  } catch (err) {
    console.error('Menu API error:', err.message);
    res.status(500).json({ error: err.message });
  }
}