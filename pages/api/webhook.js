import Stripe from 'stripe';
import { appendOrder } from '../../lib/sheets';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend  = new Resend(process.env.RESEND_API_KEY);

// Hardcoded business email addresses
const FROM_EMAIL  = 'onboarding@resend.dev';    // sends all emails
const OWNER_EMAIL = 'amanthahamilton@rootandfuelltd.com'; // receives order notifications
const DEV_EMAIL   = 'euanmunroo@gmail.com';               // dev copy

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable)
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

// ─── Customer confirmation email ──────────────────────────────────────────────
function buildCustomerEmail({ orderId, name, items, total, orderType, address, notes }) {
  const itemRows = items
    .map(i => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.quantity}× ${i.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`)
    .join('');

  const deliveryLine = orderType === 'delivery'
    ? `<p style="margin:4px 0;color:#555;"><strong>Delivery to:</strong> ${address}</p>`
    : `<p style="margin:4px 0;color:#555;"><strong>Collection</strong> — Tuesday pickup</p>`;

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

// ─── Owner notification email ─────────────────────────────────────────────────
function buildOwnerEmail({ orderId, name, email, phone, items, total, orderType, address, notes }) {
  const itemRows = items
    .map(i => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">${i.quantity}× ${i.name}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`)
    .join('');

  return {
    subject: `🛍️ New order ${orderId} — £${total.toFixed(2)} (${orderType})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f5f5;padding:32px 16px;">
        <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
            <h1 style="color:#fff;font-size:20px;margin:0;">🛍️ New Order Received</h1>
          </div>

          <div style="padding:32px;">
            <div style="background:#eaf4e8;border-radius:10px;padding:14px 18px;margin-bottom:24px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7a8f77;">Order ID</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#2d6b27;font-family:monospace;">${orderId}</p>
              <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;">£${total.toFixed(2)} · ${orderType === 'delivery' ? 'Delivery' : 'Collection'}</p>
            </div>

            <h3 style="color:#1a2418;margin:0 0 12px;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Customer</h3>
            <div style="background:#f9f7f4;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
              <p style="margin:4px 0;color:#333;"><strong>Name:</strong> ${name}</p>
              <p style="margin:4px 0;color:#333;"><strong>Email:</strong> ${email}</p>
              <p style="margin:4px 0;color:#333;"><strong>Phone:</strong> ${phone || '—'}</p>
              ${orderType === 'delivery'
                ? `<p style="margin:4px 0;color:#333;"><strong>Deliver to:</strong> ${address}</p>`
                : `<p style="margin:4px 0;color:#333;"><strong>Type:</strong> Collection (Tuesday)</p>`}
              ${notes ? `<p style="margin:4px 0;color:#333;"><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <h3 style="color:#1a2418;margin:0 0 12px;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Items</h3>
            <table style="width:100%;border-collapse:collapse;">
              ${itemRows}
              <tr>
                <td style="padding:10px 0 0;font-weight:700;font-size:16px;color:#1a1a1a;">Total</td>
                <td style="padding:10px 0 0;font-weight:700;font-size:16px;color:#2d6b27;text-align:right;">£${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `,
  };
}

// ─── Webhook handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig           = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const buf           = await buffer(req);

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(buf, sig, webhookSecret)
      : JSON.parse(buf.toString());
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta    = session.metadata;

    let items = [];
    try {
      const slim = JSON.parse(meta.itemsJson || '[]');
      items = slim.map(i => ({ name: i.n, price: i.p, quantity: i.q }));
    } catch (e) {
      console.error('Failed to parse itemsJson:', e);
    }

    const amountPaid = session.amount_total / 100;

    // 1. Write to Google Sheets
    try {
      await appendOrder({
        orderId:  meta.orderId,
        status:   'paid ✅',
        type:     meta.orderType,
        name:     meta.customerName,
        email:    session.customer_email,
        phone:    meta.customerPhone,
        table:    meta.table,
        address:  meta.address,
        items,
        total:    amountPaid,
        notes:    meta.notes,
      });
    } catch (e) {
      console.error('Sheet error:', e);
    }

    // 2. Email the customer
    try {
      const { subject, html } = buildCustomerEmail({
        orderId:   meta.orderId,
        name:      meta.customerName,
        items,
        total:     amountPaid,
        orderType: meta.orderType,
        address:   meta.address,
        notes:     meta.notes,
      });
      await resend.emails.send({
        from:    `Root + Fuel <${FROM_EMAIL}>`,
        to:      session.customer_email,
        subject,
        html,
      });
    } catch (e) {
      console.error('Customer email error:', e);
    }

    // 3. Notify the owner
    try {
      const { subject, html } = buildOwnerEmail({
        orderId:   meta.orderId,
        name:      meta.customerName,
        email:     session.customer_email,
        phone:     meta.customerPhone,
        items,
        total:     amountPaid,
        orderType: meta.orderType,
        address:   meta.address,
        notes:     meta.notes,
      });
      await resend.emails.send({
        from:    `Root + Fuel Orders <${FROM_EMAIL}>`,
        to:      [DEV_EMAIL],
        subject,
        html,
      });
    } catch (e) {
      console.error('Owner email error:', e);
    }
  }

  res.json({ received: true });
}