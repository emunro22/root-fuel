// pages/api/slot-override.js
import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function getPassword(req) {
  return req.headers['x-admin-password'] || '';
}

export default async function handler(req, res) {
  // GET — return current override (no auth needed, checkout uses this)
  if (req.method === 'GET') {
    const override = await kv.get('collection_override') || null;
    return res.status(200).json({ override });
  }

  // All write methods require auth
  const pw = getPassword(req);
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  // PUT — set or clear an override
  // Body: { disabled: true, label: "Early closure — Tue 20 May" } or { disabled: false }
  if (req.method === 'PUT') {
    const { disabled, label } = req.body || {};

    if (!disabled) {
      // Clear the override — collection is back to normal
      await kv.del('collection_override');
      return res.status(200).json({ override: null });
    }

    const override = {
      disabled: true,
      label: label?.trim() || 'Collection unavailable this week',
      setAt: new Date().toISOString(),
    };
    await kv.set('collection_override', override);
    return res.status(200).json({ override });
  }

  return res.status(405).end();
}