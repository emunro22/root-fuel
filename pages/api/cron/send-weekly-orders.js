// Runs weekly via Vercel Cron (Saturday 9am). Emails the owner a CSV of every
// order confirmed since the last run, a totals summary, and a section
// listing customer notes/special requests. Replaces the old Google Sheets
// order ledger — pages/api/webhook.js writes each confirmed order to
// `order:<id>` in KV and queues its id in `orders:digest_queue`; this route
// drains that queue and resets it once the email has sent successfully.
import { kv } from '@vercel/kv';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_REPORT  = 'Root + Fuel <orders@rootandfuelltd.com>';
const OWNER_EMAIL  = 'samanthahamilton@rootandfuelltd.com';
const QUEUE_KEY    = 'orders:digest_queue';

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildOrdersCsv(orders) {
  const header = ['Order ID', 'Paid At (UTC)', 'Name', 'Email', 'Phone', 'Type', 'Delivery Day', 'Items', 'Subtotal', 'Delivery Fee', 'Total', 'Notes'];
  const rows = orders.map(o => {
    const itemsStr = (o.items || []).map(i => `${i.quantity}x ${i.name}`).join('; ');
    const deliveryFee = o.deliveryFee ? parseFloat(o.deliveryFee) : 0;
    const subtotal = (o.total || 0) - deliveryFee;
    return [
      o.orderId,
      o.paidAt || '',
      o.name,
      o.email,
      o.phone || '',
      o.type,
      o.deliveryDay || '',
      itemsStr,
      subtotal.toFixed(2),
      deliveryFee.toFixed(2),
      (o.total || 0).toFixed(2),
      o.notes || '',
    ];
  });
  return [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\r\n');
}

function buildItemSummary(orders) {
  const counts = new Map();
  for (const o of orders) {
    for (const i of (o.items || [])) {
      counts.set(i.name, (counts.get(i.name) || 0) + i.quantity);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, quantity]) => ({ name, quantity }));
}

function buildDigestEmail(orders) {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const notesOrders = orders.filter(o => o.notes && o.notes.trim());
  const itemSummary = buildItemSummary(orders);

  const notesHtml = notesOrders.length
    ? notesOrders.map(o => `<p style="margin:8px 0; font-size:14px; color:#333;"><strong>${o.name}</strong>: ${o.notes}</p>`).join('')
    : '<p style="margin:8px 0; font-size:14px; color:#888;">No notes this week.</p>';

  const itemSummaryHtml = itemSummary.length
    ? `<table style="width:100%; border-collapse:collapse;">
        ${itemSummary.map(i => `
          <tr>
            <td style="padding:6px 0; border-bottom:1px solid #eee; color:#333; font-size:14px;">${i.name}</td>
            <td style="padding:6px 0; border-bottom:1px solid #eee; text-align:right; color:#316431; font-size:14px; font-weight:bold;">${i.quantity}x</td>
          </tr>
        `).join('')}
      </table>`
    : '<p style="margin:8px 0; font-size:14px; color:#888;">No items this week.</p>';

  return {
    subject: `Weekly Orders Report — ${totalOrders} order${totalOrders === 1 ? '' : 's'}, £${totalRevenue.toFixed(2)}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f5f1ea; padding:40px 10px;">
        <div style="max-width:560px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#316431; padding:30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">Root + Fuel</h1>
            <p style="color:#cfe3cf; margin:8px 0 0; font-size:13px;">Weekly Orders Report</p>
          </div>
          <div style="padding:30px;">
            <h2 style="margin-top:0; color:#316431; font-size:20px;">Summary</h2>
            <p style="margin:5px 0; font-size:15px; color:#333;"><strong>Total Orders:</strong> ${totalOrders}</p>
            <p style="margin:5px 0 15px; font-size:15px; color:#333;"><strong>Total Revenue:</strong> £${totalRevenue.toFixed(2)}</p>
            <p style="margin:0; font-size:13px; color:#888;">Full order details are attached as a CSV file.</p>
            <h4 style="margin:25px 0 10px; color:#316431; border-bottom:2px solid #f5f1ea; padding-bottom:5px;">Item Summary</h4>
            ${itemSummaryHtml}
            <h4 style="margin:25px 0 10px; color:#316431; border-bottom:2px solid #f5f1ea; padding-bottom:5px;">Notes &amp; Special Requests</h4>
            ${notesHtml}
          </div>
        </div>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let orderIds = [];
  try {
    orderIds = await kv.lrange(QUEUE_KEY, 0, -1);
  } catch (e) {
    console.error('[cron] Failed to read orders digest queue:', e.message);
    return res.status(500).json({ error: 'KV read failed' });
  }

  const orders = [];
  for (const orderId of orderIds) {
    try {
      const order = await kv.get(`order:${orderId}`);
      if (order) orders.push(order);
    } catch (e) {
      console.error(`[cron] Failed to read order ${orderId}:`, e.message);
    }
  }

  const { subject, html } = buildDigestEmail(orders);
  const csv = buildOrdersCsv(orders);

  try {
    await resend.emails.send({
      from: FROM_REPORT,
      to: OWNER_EMAIL,
      subject,
      html,
      attachments: [{
        filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
        content: Buffer.from(csv, 'utf-8'),
      }],
    });
  } catch (e) {
    console.error('[cron] Failed to send weekly orders digest:', e.message);
    return res.status(500).json({ error: 'Email send failed' });
  }

  try {
    await kv.del(QUEUE_KEY);
  } catch (e) {
    console.error('[cron] Failed to clear orders digest queue:', e.message);
  }

  return res.json({ ordersFound: orderIds.length, ordersSent: orders.length });
}
