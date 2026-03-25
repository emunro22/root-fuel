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

/* ================= CUSTOMER EMAIL ================= */
function buildCustomerEmail({ orderId, name, items, total, orderType, address, notes, collectionSlot }) {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.quantity}× ${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const deliveryLine = orderType === 'delivery'
    ? `<p><strong>Delivery:</strong> ${address}</p>`
    : `<p><strong>Collection:</strong> ${collectionSlot || 'Tuesday pickup'}</p>`;

  return {
    subject: `Your Root + Fuel order is confirmed! (${orderId})`,
    html: `
      <div style="font-family:Arial;padding:20px;background:#f5f1ea;">
        <div style="max-width:500px;margin:auto;background:#fff;border-radius:12px;padding:20px;">
          <h2>Order Confirmed ✅</h2>
          <p>Hi ${name}, thanks for your order.</p>

          <h3>${orderId}</h3>

          <table style="width:100%;">
            ${itemRows}
            <tr>
              <td><strong>Total</strong></td>
              <td style="text-align:right;"><strong>£${total.toFixed(2)}</strong></td>
            </tr>
          </table>

          ${deliveryLine}
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}

          <p style="margin-top:20px;">Pickup is every Tuesday.</p>
        </div>
      </div>
    `,
  };
}

/* ================= OWNER EMAIL (OLD STYLE) ================= */
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

  return {
    subject: `New order ${orderId} — £${total.toFixed(2)} (${orderType})`,
    html: `
      <div style="font-family:Arial;background:#f4f4f4;padding:20px;">
        <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;">

          <div style="background:#111;color:#fff;padding:16px;text-align:center;">
            <h2 style="margin:0;">🛍️ New Order Received</h2>
          </div>

          <div style="padding:20px;">

            <div style="background:#e6efe6;padding:16px;border-radius:10px;text-align:center;">
              <p style="margin:0;font-size:12px;">ORDER ID</p>
              <h3 style="margin:5px 0;">${orderId}</h3>
              <p style="margin:0;">£${total.toFixed(2)} • ${orderType} — ${collectionSlot || ''}</p>
            </div>

            <h4 style="margin-top:20px;">Customer</h4>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Type:</strong> ${orderType}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}

            <h4 style="margin-top:20px;">Items</h4>
            <table style="width:100%;">
              ${itemRows}
              <tr>
                <td><strong>Total</strong></td>
                <td style="text-align:right;"><strong>£${total.toFixed(2)}</strong></td>
              </tr>
            </table>

          </div>
        </div>
      </div>
    `,
  };
}

/* ================= HANDLER ================= */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
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

    const items = JSON.parse(meta.itemsJson || '[]').map(i => ({
      name: i.n,
      price: i.p,
      quantity: i.q
    }));

    const total = session.amount_total / 100;

    /* Save */
    await appendOrder({
      orderId: meta.orderId,
      status: 'paid',
      type: meta.orderType,
      name: meta.customerName,
      email: session.customer_email,
      phone: meta.customerPhone,
      address: meta.address,
      items,
      total,
      notes: meta.notes,
      collectionSlot: meta.collectionSlot,
    });

    /* Customer email */
    const customer = buildCustomerEmail({
      orderId: meta.orderId,
      name: meta.customerName,
      items,
      total,
      orderType: meta.orderType,
      address: meta.address,
      notes: meta.notes,
      collectionSlot: meta.collectionSlot,
    });

    await resend.emails.send({
      from: `Root + Fuel <${FROM_CONFIRM}>`,
      to: session.customer_email,
      ...customer,
    });

    /* Owner email */
    const owner = buildOwnerEmail({
      orderId: meta.orderId,
      name: meta.customerName,
      email: session.customer_email,
      phone: meta.customerPhone,
      items,
      total,
      orderType: meta.orderType,
      address: meta.address,
      notes: meta.notes,
      collectionSlot: meta.collectionSlot,
    });

    await resend.emails.send({
      from: `Root + Fuel Orders <${FROM_ORDERS}>`,
      to: [OWNER_EMAIL, DEV_EMAIL],
      ...owner,
    });
  }

  return res.json({ received: true });
}