import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rootandfuel2025';

function getLockStatus(holidays) {
  const now = new Date();

  for (const h of holidays) {
    const from = new Date(h.from + 'T00:00:00');
    const to   = new Date(h.to   + 'T23:59:59');

    if (now >= from && now <= to) {
      return {
        locked: true,
        reason: `We're closed for: ${h.label}. We'll be back shortly!`,
        source: 'holiday',
        holiday: h,
      };
    }
  }

  const day = now.getDay();
  if (day === 0 || day === 1 || day === 2) {
    return {
      locked: true,
      reason: 'Ordering is closed while we fulfil this week\'s batch. Orders reopen Wednesday.',
      source: 'weekly',
    };
  }

  const daysUntilSat = (6 - day + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSat);
  target.setHours(23, 59, 59, 999);

  return {
    locked: false,
    reason: `Ordering is open until Saturday midnight.`,
    source: 'open',
    deadline: target.toISOString(),
  };
}

export default async function handler(req, res) {
  const isAuthed = () => {
    const pw = req.headers['x-admin-password'];
    return pw === ADMIN_PASSWORD;
  };

  // POST — auth
  if (req.method === 'POST') {
    const { action, password } = req.body || {};

    if (action === 'auth') {
      if (password === ADMIN_PASSWORD) return res.status(200).json({ ok: true });
      return res.status(401).json({ error: 'Incorrect password' });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  // GET — fetch holidays
  if (req.method === 'GET') {
    if (!isAuthed()) return res.status(401).json({ error: 'Unauthorized' });

    const holidays = await kv.get('holidays') || [];
    const status   = getLockStatus(holidays);

    return res.status(200).json({ holidays, status });
  }

  // PUT — save holidays
  if (req.method === 'PUT') {
    if (!isAuthed()) return res.status(401).json({ error: 'Unauthorized' });

    const { holidays } = req.body || {};
    if (!Array.isArray(holidays)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await kv.set('holidays', holidays);

    const status = getLockStatus(holidays);

    return res.status(200).json({ holidays, status });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}