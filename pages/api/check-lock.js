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

  // 2. Weekly lock — Mon(1), Tue(2), Wed(3), Thu(4)
  const day = now.getDay();
  if (day === 1 || day === 2 || day === 3 || day === 4) {
    return {
      locked: true,
      reason: "Orders are closed while we prepare this week's batch. Reopens Friday.",
      source: 'weekly',
    };
  }

  // 3. Open — Fri(5), Sat(6), Sun(0); deadline = Sunday midnight
  const daysUntilSun = (7 - day) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSun);
  target.setHours(23, 59, 59, 999);

  return {
    locked: false,
    reason: 'Ordering is open until Sunday midnight.',
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