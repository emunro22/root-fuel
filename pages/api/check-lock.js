import { kv } from '@vercel/kv';

function getLockStatus(holidays) {
  const now = new Date();

  // 1. Holiday closures
  for (const h of holidays) {
    const from = new Date(h.from + 'T00:00:00');
    const to   = new Date(h.to   + 'T23:59:59');

    if (now >= from && now <= to) {
      return {
        locked: true,
        reason: `We're currently closed for: ${h.label}. We'll be back soon!`,
        source: 'holiday',
        label: h.label,
        reopens: to.toISOString(),
      };
    }
  }

  // 2. Weekly lock
  const day = now.getDay();
  if (day === 0 || day === 1 || day === 2) {
    return {
      locked: true,
      reason: "Orders are closed while we fulfil this week's batch. Reopens Wednesday.",
      source: 'weekly',
    };
  }

  // 3. Open
  const daysUntilSat = (6 - day + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSat);
  target.setHours(23, 59, 59, 999);

  return {
    locked: false,
    reason: 'Ordering is open until Saturday midnight.',
    source: 'open',
    deadline: target.toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const holidays = await kv.get('holidays') || [];

  const status = getLockStatus(holidays);

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  return res.status(200).json(status);
}