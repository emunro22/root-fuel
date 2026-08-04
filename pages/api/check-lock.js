import { kv } from '@vercel/kv';

function getLockStatus(holidays) {
  const now = new Date();

  // 1. Holiday closures — override everything
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
        tuesday: { open: false },
      };
    }
  }

  // 2. Delivery window: Tuesday delivery, order Wed(3) → Sat(6) midnight
  const day = now.getDay();

  const tuesdayOpen = day >= 3 && day <= 6;

  const result = {
    locked: false,
    source: 'open',
    tuesday: { open: tuesdayOpen },
  };

  if (tuesdayOpen) {
    const daysUntilSat = 6 - day;
    const target = new Date(now);
    target.setDate(now.getDate() + daysUntilSat);
    target.setHours(23, 59, 59, 999);
    result.tuesday.deadline = target.toISOString();
  }

  result.reason = tuesdayOpen
    ? 'Ordering is open for Tuesday (order by Saturday midnight) delivery.'
    : 'Ordering is currently closed. It reopens Wednesday.';

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const holidays = await kv.get('holidays') || [];

  const status = getLockStatus(holidays);

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  return res.status(200).json(status);
}