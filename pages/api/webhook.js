import Stripe from 'stripe';
import { appendOrder } from '../../lib/sheets';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend  = new Resend(process.env.RESEND_API_KEY);

const FROM_ORDERS     = 'orders@rootandfuelltd.com';
const FROM_CONFIRM    = 'order-confirmation@rootandfuelltd.com';
const OWNER_EMAIL     = 'samanthahamilton@rootandfuelltd.com';
const DEV_EMAIL       = 'euanmunroo@gmail.com';

export const config = { api: { bodyParser: false } };

const processedEvents = new Set();

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable)
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

function buildCustomerEmail({ orderId, name, items, total, orderType, address, notes, collectionSlot }) {
  const itemRows = items
    .map(i => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.quantity}× ${i.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`)
    .join('');

  const deliveryLine = orderType === 'delivery'
    ? `<p style="margin:4px 0;color:#555;"><strong>Delivery to:</strong> ${address}</p>`
    : `<p style="margin:4px 0;color:#555;"><strong>Collection slot:</strong> ${collectionSlot || 'Tuesday pickup'}</p>`;

  const collectionInfo = orderType !== 'delivery' ? `
    <div style="background:#f9f7f4;border-radius:10px;padding:16px 18px;margin:16px 0;">
      <p style="margin:0 0 10px;color:#333;font-size:14px;line-height:1.6;">
        We ask that you arrive on time but appreciate delays can happen — just send a DM on Instagram so we know whether to put your order back in the fridge.
      </p>

      <p style="margin:0 0 12px;color:#b07800;font-size:14px;font-weight:bold;background:#fff8e1;padding:10px 14px;border-radius:6px;">
        Please do not arrive before your slot — food is made to order and will not be bagged.
      </p>

      <div style="background:#ffffff;border-radius:8px;padding:12px 14px;margin-bottom:12px;">
        <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;">Address</p>
        <p style="margin:0;color:#2d6b27;font-weight:600;line-height:1.6;">
          All Tots Nursery<br>
          64 Cowdenhill Road<br>
          G13 2HE
        </p>
      </div>

      <p style="margin:0 0 10px;color:#333;font-size:14px;line-height:1.6;">
        We have a small carpark — message the page to confirm your arrival and we will bring your food to you.
      </p>

      <p style="margin:0;color:#b07800;font-size:14px;font-weight:bold;background:#fff8e1;padding:10px 14px;border-radius:6px;">
        Please do not ring the bell as it belongs to the nursery next door and we will not hear it.
      </p>
    </div>
  ` : '';

  const notesLine = notes
    ? `<p style="margin:4px 0;color:#555;"><strong>Notes:</strong> ${notes}</p>`
    : '';

  return {
    subject: `Your Root + Fuel order is confirmed! (${orderId})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f1ea;padding:32px 16px;">
        <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:#2d6b27;padding:32px 32px 24px;text-align:center;">
            <h1 style="color:#fff;font-size:26px;margin:0;font-weight:600;">Root + Fuel</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px;">Performance nutrition, rooted in nature</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1a2418;font-size:22px;margin:0 0 8px;">Order Confirmed ✅</h2>
            <p style="color:#555;margin:0 0 24px;">Hi ${name}, thanks for your order! Here's your summary:</p>

            <div style="background:#eaf4e8;border-radius:10px;padding:14px 18px;margin-bottom:24px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7a8f77;">Order ID</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#2d6b27;font-family:monospace;letter-spacing:2px;">${orderId}</p>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              ${itemRows}
              <tr>
                <td style="padding:12px 0 0;font-weight:700;font-size:17px;color:#1a2418;">Total</td>
                <td style="padding:12px 0 0;font-weight:700;font-size:17px;color:#2d6b27;text-align:right;">£${total.toFixed(2)}</td>
              </tr>
            </table>

            <div style="background:#f9f7f4;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
              ${deliveryLine}
              ${notesLine}
            </div>

            ${collectionInfo}

            <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#7a6000;font-size:14px;">🗓️ <strong>Remember:</strong> Orders are prepared and available every <strong>Tuesday</strong>.</p>
            </div>

            <p style="color:#aaa;font-size:13px;margin:0;">Questions? Reply to this email and we'll get back to you.</p>
          </div>

          <div style="background:#1a1a1a;padding:20px 32px;text-align:center;">
            <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} Root + Fuel Ltd · Glasgow · Whole Food · Locally Sourced</p>
          </div>
        </div>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig           = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const buf           = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency check — skip duplicate events
  if (processedEvents.has(event.id)) {
    console.log(`[webhook] Skipping duplicate event: ${event.id}`);
    return res.json({ received: true });
  }
  processedEvents.add(event.id);
  if (processedEvents.size > 500) {
    processedEvents.delete(processedEvents.values().next().value);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta    = session.metadata;

    let items = [];
    try {
      const slim = JSON.parse(meta.itemsJson || '[]');
      items = slim.map(i => ({ name: i.n, price: i.p, quantity: i.q }));
    } catch (e) {
      console.error('[webhook] Failed to parse itemsJson:', e);
    }

    const amountPaid      = session.amount_total / 100;
    const collectionSlot  = meta.collectionSlot || null;

    // 1. Write to Google Sheets
    try {
      await appendOrder({
        orderId:        meta.orderId,
        status:         'paid ✅',
        type:           meta.orderType,
        name:           meta.customerName,
        email:          session.customer_email,
        phone:          meta.customerPhone,
        table:          meta.table,
        address:        meta.address,
        items,
        total:          amountPaid,
        notes:          meta.notes,
        collectionSlot,
      });
    } catch (e) {
      console.error('[webhook] Sheet error:', e);
    }

    // 2. Email the customer
    try {
      const { subject, html } = buildCustomerEmail({
        orderId:        meta.orderId,
        name:           meta.customerName,
        items,
        total:          amountPaid,
        orderType:      meta.orderType,
        address:        meta.address,
        notes:          meta.notes,
        collectionSlot,
      });
      await resend.emails.send({
        from:    `Root + Fuel <${FROM_CONFIRM}>`,
        to:      session.customer_email,
        subject,
        html,
      });
    } catch (e) {
      console.error('[webhook] Customer email error:', e);
    }

    // 3. Notify owner + dev
    try {
      const { subject, html } = buildOwnerEmail({
        orderId:        meta.orderId,
        name:           meta.customerName,
        email:          session.customer_email,
        phone:          meta.customerPhone,
        items,
        total:          amountPaid,
        orderType:      meta.orderType,
        address:        meta.address,
        notes:          meta.notes,
        collectionSlot,
      });
      await resend.emails.send({
        from:    `Root + Fuel Orders <${FROM_ORDERS}>`,
        to:      [OWNER_EMAIL, DEV_EMAIL],
        subject,
        html,
      });
    } catch (e) {
      console.error('[webhook] Owner email error:', e);
    }
  }

  // ✅ Respond LAST — after all work is done
  return res.json({ received: true });
}