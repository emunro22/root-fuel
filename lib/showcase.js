import { kv } from '@vercel/kv';

const KEY = 'showcase_items';
const VALID_STATUSES = ['current', 'past'];

export async function getShowcaseItems() {
  const items = await kv.get(KEY);
  return Array.isArray(items) ? items : [];
}

export async function addShowcaseItem({ image, status, title, description }) {
  if (!VALID_STATUSES.includes(status)) throw new Error('Invalid status');
  const items = await getShowcaseItems();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image,
    status,
    title: title || '',
    description: description || '',
    createdAt: new Date().toISOString(),
  };
  const updated = [item, ...items];
  await kv.set(KEY, updated);
  return updated;
}

export async function updateShowcaseItem(id, fields) {
  if (fields.status && !VALID_STATUSES.includes(fields.status)) throw new Error('Invalid status');
  const items = await getShowcaseItems();
  const updated = items.map(i => (i.id === id ? { ...i, ...fields } : i));
  await kv.set(KEY, updated);
  return updated;
}

export async function deleteShowcaseItem(id) {
  const items = await getShowcaseItems();
  const updated = items.filter(i => i.id !== id);
  await kv.set(KEY, updated);
  return updated;
}
