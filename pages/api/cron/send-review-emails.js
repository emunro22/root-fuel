// Runs daily via Vercel Cron. Sends "how did we do" review follow-ups to
// customers whose delivery falls on today's UK date, then clears the queue.
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { buildReviewFollowupEmail, todayUkDateString } from '../../../lib/reviewFollowup';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_REVIEW = 'Root + Fuel <feedback@rootandfuelltd.com>';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = todayUkDateString();
  const key = `review_followups:${today}`;

  let orderIds = [];
  try {
    orderIds = await kv.lrange(key, 0, -1);
  } catch (e) {
    console.error('[cron] Failed to read review follow-up queue:', e.message);
    return res.status(500).json({ error: 'KV read failed' });
  }

  let sent = 0;
  for (const orderId of orderIds) {
    try {
      const info = await kv.get(`review_order:${orderId}`);
      if (!info) continue;

      const { subject, html } = buildReviewFollowupEmail({ name: info.name, orderId });
      await resend.emails.send({
        from: FROM_REVIEW,
        to: info.email,
        subject,
        html,
      });
      await kv.del(`review_order:${orderId}`);
      sent++;
    } catch (e) {
      console.error(`[cron] Failed to send review follow-up for ${orderId}:`, e.message);
    }
  }

  if (orderIds.length) {
    await kv.del(key).catch(() => {});
  }

  return res.json({ date: today, found: orderIds.length, sent });
}
