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

/* =========================
   CUSTOMER EMAIL (FULL DESIGN)
========================= */
function buildCustomerEmail({ orderId, name, items, total, orderType, address, notes, collectionSlot }) {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.quantity}× ${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

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
          <div style="background:#2d6b27;padding:32px;text-align:center;">
            <h1 style="color:#fff;margin:0;">Root + Fuel</h1>
          </div>

          <div style="padding:32px;">
            <h2>Order Confirmed ✅</h2>
            <p>Hi ${name}, thanks for your order!</p>

            <p><strong>Order ID:</strong> ${orderId}</p>

            <table style="width:100%;margin:16px 0;">
              ${itemRows}
              <tr>
                <td><strong>Total</strong></td>
                <td style="text-align:right;"><strong>£${total.toFixed(2)}</strong></td>
              </tr>
            </table>

            ${deliveryLine}
            ${notesLine}
            ${collectionInfo}

            <p>Orders are prepared every Tuesday.</p>
          </div>
        </div>
      </div>
    `,
  };
}

/* =========================
   OWNER EMAIL (FULL DESIGN)
========================= */
function buildOwnerEmail({
  orderId,
  name,
  email,
  phone,
  items,
  total,
  orderType,
  address,
  notes,
  collectionSlot
}) {
  const itemRows = items.map(i => `
    <tr>
      <td>${i.quantity}× ${i.name}</td>
      <td style="text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const deliveryLine = orderType === 'delivery'
    ? `<p><strong>Delivery:</strong> ${address}</p>`
    : `<p><strong>Collection slot:</strong> ${collectionSlot || 'Not set'}</p>`;

  const notesLine = notes ? `<p><strong>Notes:</strong> ${notes}</p>` : '';

  return {
    subject: `🚨 New Order Received (${orderId})`,
    html: `
      <div style="font-family:Arial;padding:20px;">
        <h2>New Order 🚀</h2>

        <p><strong>Order ID:</strong> ${orderId}</p>

        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>

        ${deliveryLine}
        ${notesLine}

        <table style="width:100%;margin-top:10px;">
          ${itemRows}
          <tr>
            <td><strong>Total</strong></td>
            <td style="text-align:right;"><strong>£${total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>
    `,
  };
}

/* =========================
   HANDLER
========================= */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (processedEvents.has(event.id)) {
    return res.json({ received: true });
  }
  processedEvents.add(event.id);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata;

    let items = [];
    try {
      const slim = JSON.parse(meta.itemsJson || '[]');
      items = slim.map(i => ({ name: i.n, price: i.p, quantity: i.q }));
    } catch {}

    const amountPaid = session.amount_total / 100;

    await appendOrder({
      orderId: meta.orderId,
      status: 'paid',
      type: meta.orderType,
      name: meta.customerName,
      email: session.customer_email,
      phone: meta.customerPhone,
      address: meta.address,
      items,
      total: amountPaid,
      notes: meta.notes,
      collectionSlot: meta.collectionSlot || null,
    });

    // CUSTOMER EMAIL
    const customerEmail = buildCustomerEmail({
      orderId: meta.orderId,
      name: meta.customerName,
      items,
      total: amountPaid,
      orderType: meta.orderType,
      address: meta.address,
      notes: meta.notes,
      collectionSlot: meta.collectionSlot,
    });

    await resend.emails.send({
      from: `Root + Fuel <${FROM_CONFIRM}>`,
      to: session.customer_email,
      ...customerEmail,
    });

    // OWNER EMAIL
    const ownerEmail = buildOwnerEmail({
      orderId: meta.orderId,
      name: meta.customerName,
      email: session.customer_email,
      phone: meta.customerPhone,
      items,
      total: amountPaid,
      orderType: meta.orderType,
      address: meta.address,
      notes: meta.notes,
      collectionSlot: meta.collectionSlot,
    });

    await resend.emails.send({
      from: `Root + Fuel Orders <${FROM_ORDERS}>`,
      to: [OWNER_EMAIL, DEV_EMAIL],
      ...ownerEmail,
    });
  }

  return res.json({ received: true });
}