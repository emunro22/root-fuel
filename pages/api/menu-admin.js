import { getAllMenuRows, addMenuRow, updateMenuRow, deleteMenuRow } from '../../lib/sheets';

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
      const rows = await getAllMenuRows();
      return res.status(200).json({ items: rows });
    } catch (e) {
      console.error('[menu-admin] GET error:', e);
      return res.status(500).json({ error: 'Failed to fetch menu items' });
    }
  }

  if (req.method === 'POST') {
    const { category, name, description, price, image, available } = req.body || {};
    if (!category || !name) return res.status(400).json({ error: 'category and name are required' });
    try {
      await addMenuRow({ category, name, description: description || '', price: parseFloat(price) || 0, image: image || '', available: !!available });
      const rows = await getAllMenuRows();
      return res.status(200).json({ items: rows });
    } catch (e) {
      console.error('[menu-admin] POST error:', e);
      return res.status(500).json({ error: 'Failed to add menu item' });
    }
  }

  if (req.method === 'PUT') {
    const { rowNumber, category, name, description, price, image, available } = req.body || {};
    if (!rowNumber || !category || !name) return res.status(400).json({ error: 'rowNumber, category and name are required' });
    try {
      await updateMenuRow(parseInt(rowNumber), { category, name, description: description || '', price: parseFloat(price) || 0, image: image || '', available: !!available });
      const rows = await getAllMenuRows();
      return res.status(200).json({ items: rows });
    } catch (e) {
      console.error('[menu-admin] PUT error:', e);
      return res.status(500).json({ error: 'Failed to update menu item' });
    }
  }

  if (req.method === 'DELETE') {
    const { rowNumber } = req.body || {};
    if (!rowNumber) return res.status(400).json({ error: 'rowNumber is required' });
    try {
      await deleteMenuRow(parseInt(rowNumber));
      const rows = await getAllMenuRows();
      return res.status(200).json({ items: rows });
    } catch (e) {
      console.error('[menu-admin] DELETE error:', e);
      return res.status(500).json({ error: 'Failed to delete menu item' });
    }
  }

  return res.status(405).end();
}
