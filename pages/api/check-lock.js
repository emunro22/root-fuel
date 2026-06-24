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
        friday:  { open: false },
      };
    }
  }

  // 2. Two delivery windows
  //    Tuesday delivery: order Wed(3) → Sat(6) midnight
  //    Friday  delivery: order Sat(6) → Tue(2) midnight
  const day = now.getDay();

  const tuesdayOpen = day >= 3 && day <= 6;
  const fridayOpen  = day === 6 || day <= 2;

  const result = {
    locked: false,
    source: 'open',
    tuesday: { open: tuesdayOpen },
    friday:  { open: fridayOpen },
  };

  if (tuesdayOpen) {
    const daysUntilSat = 6 - day;
    const target = new Date(now);
    target.setDate(now.getDate() + daysUntilSat);
    target.setHours(23, 59, 59, 999);
    result.tuesday.deadline = target.toISOString();
  }

  if (fridayOpen) {
    const daysUntilTue = (2 - day + 7) % 7;
    const target = new Date(now);
    target.setDate(now.getDate() + daysUntilTue);
    target.setHours(23, 59, 59, 999);
    result.friday.deadline = target.toISOString();
  }

  const parts = [];
  if (tuesdayOpen) parts.push('Tuesday (order by Saturday midnight)');
  if (fridayOpen)  parts.push('Friday (order by Tuesday midnight)');
  result.reason = `Ordering is open for ${parts.join(' and ')} delivery.`;

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const holidays = await kv.get('holidays') || [];

  const status = getLockStatus(holidays);

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  return res.status(200).json(status);
}