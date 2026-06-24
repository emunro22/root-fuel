import { put, del } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

  // POST — upload an image
  if (req.method === 'POST') {
    const { filename, contentType, data } = req.body || {};
    if (!filename || !data) return res.status(400).json({ error: 'filename and data are required' });

    try {
      const buffer = Buffer.from(data, 'base64');
      const safeName = `menu/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const blob = await put(safeName, buffer, {
        access: 'public',
        contentType: contentType || 'image/jpeg',
      });
      return res.status(200).json({ url: blob.url });
    } catch (e) {
      console.error('[upload-image] PUT error:', e.message, e);
      const detail = e.message || 'Unknown error';
      return res.status(500).json({ error: `Upload failed: ${detail}` });
    }
  }

  // DELETE — remove an image by URL
  if (req.method === 'DELETE') {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });
    try {
      await del(url);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[upload-image] DELETE error:', e);
      return res.status(500).json({ error: 'Delete failed' });
    }
  }

  return res.status(405).end();
}
