import { getShowcaseItems, addShowcaseItem, updateShowcaseItem, deleteShowcaseItem } from '../../lib/showcase';

function checkAuth(req, res) {
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const items = await getShowcaseItems();
      return res.status(200).json({ items });
    } catch (e) {
      console.error('[showcase-admin] GET error:', e);
      return res.status(500).json({ error: 'Failed to fetch items' });
    }
  }

  if (req.method === 'POST') {
    const { image, status, title, description } = req.body || {};
    if (!image || !status) return res.status(400).json({ error: 'image and status are required' });
    try {
      const items = await addShowcaseItem({ image, status, title, description });
      return res.status(200).json({ items });
    } catch (e) {
      console.error('[showcase-admin] POST error:', e);
      return res.status(500).json({ error: e.message || 'Failed to add item' });
    }
  }

  if (req.method === 'PUT') {
    const { id, image, status, title, description } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const items = await updateShowcaseItem(id, { image, status, title, description });
      return res.status(200).json({ items });
    } catch (e) {
      console.error('[showcase-admin] PUT error:', e);
      return res.status(500).json({ error: e.message || 'Failed to update item' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const items = await deleteShowcaseItem(id);
      return res.status(200).json({ items });
    } catch (e) {
      console.error('[showcase-admin] DELETE error:', e);
      return res.status(500).json({ error: 'Failed to delete item' });
    }
  }

  return res.status(405).end();
}
