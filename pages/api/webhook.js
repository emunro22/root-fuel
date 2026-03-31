import Stripe from 'stripe';
import { appendOrder } from '../../lib/sheets';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend  = new Resend(process.env.RESEND_API_KEY);

const FROM_ORDERS  = 'orders@rootandfuelltd.com';
const FROM_CONFIRM = 'order-confirmation@rootandfuelltd.com';
const OWNER_EMAIL  = 'samanthahamilton@rootandfuelltd.com';
const DEV_EMAIL    = 'euanmunroo@gmail.com';

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
      <td style="padding:10px 0; border-bottom:1px solid #eee; color:#333;">${i.quantity}× ${i.name}</td>
      <td style="padding:10px 0; border-bottom:1px solid #eee; text-align:right; color:#333;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const instructionsBlock = orderType === 'delivery'
    ? `<p style="margin:15px 0 5px; color:#555;"><strong>Delivery Address:</strong><br/>${address}</p>`
    : `
      <div style="margin-top:20px; padding:15px; background:#f9fcf9; border-radius:12px; border:1px solid #e1eee1;">
        <p style="margin:0 0 10px; color:#316431; font-weight:bold; font-size:16px;">Collection Details</p>
        <p style="margin:0 0 5px; color:#555; font-size:14px;"><strong>Slot:</strong> ${collectionSlot || '13:00'}</p>
        <p style="margin:0 0 15px; color:#555; font-size:14px;"><strong>Address:</strong><br/>All Tots Nursery, 64 Cowdenhill Road, G13 2HE</p>
        <p style="margin:0 0 10px; font-size:13px; color:#666; line-height:1.4;">
          We ask that you arrive on time but appreciate delays can happen, just send a DM on insta so we know whether to put your order back in the fridge.
        </p>
        <p style="margin:0 0 10px; font-size:13px; color:#c68a12; font-weight:bold; line-height:1.4;">
          Please do not arrive before your slot, food is made to order and will not be bagged.
        </p>
        <p style="margin:0; font-size:13px; color:#666; line-height:1.4;">
          We have a small carpark, message the page to confirm your arrival and we will bring your food to you.
          <strong>Please do not ring the bell</strong> as it belongs to the nursery next door and we will not hear it.
        </p>
      </div>
    `;

  return {
    subject: `Your Root + Fuel order is confirmed! (${orderId})`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f5f1ea; padding:40px 10px;">
        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#316431; padding:30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">Root + Fuel</h1>
          </div>
          <div style="padding:30px;">
            <h2 style="margin-top:0; color:#316431; font-size:20px;">Order Confirmed ✅</h2>
            <p style="color:#555; line-height:1.5;">Hi ${name}, thanks for your order!</p>
            <p style="color:#888; font-size:13px; margin-bottom:20px;"><strong>Order ID:</strong> ${orderId}</p>
            <table style="width:100%; border-collapse:collapse;">
              ${itemRows}
              <tr>
                <td style="padding:15px 0; font-weight:bold; font-size:16px;">Total</td>
                <td style="padding:15px 0; text-align:right; font-weight:bold; font-size:16px;">£${total.toFixed(2)}</td>
              </tr>
            </table>
            ${instructionsBlock}
            ${notes ? `<p style="margin:15px 0; font-size:14px; color:#666; background:#f9f9f9; padding:10px; border-radius:8px;"><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
        </div>
      </div>
    `,
  };
}

/* ================= OWNER EMAIL ================= */
function buildOwnerEmail({ orderId, name, email, phone, items, total, orderType, address, notes, collectionSlot }) {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #eee; color:#333;">${i.quantity}× ${i.name}</td>
      <td style="padding:10px 0; border-bottom:1px solid #eee; text-align:right; color:#333;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return {
    subject: `🛍️ New order ${orderId} — £${total.toFixed(2)} (${orderType})`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f5f1ea; padding:40px 10px;">
        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#316431; padding:30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">Root + Fuel</h1>
          </div>
          <div style="padding:30px;">
            <div style="background:#eef5ee; border-radius:12px; padding:20px; text-align:center; margin-bottom:25px;">
              <h2 style="margin:0; color:#316431; font-size:20px;">🛍️ New Order Received</h2>
              <p style="margin:10px 0 5px; color:#111; font-size:18px; font-weight:bold;">${orderId}</p>
              <p style="margin:0; color:#444;">£${total.toFixed(2)} • ${orderType.toUpperCase()}${orderType === 'pickup' ? ` — ${collectionSlot || '13:00'}` : ''}</p>
            </div>
            <h4 style="margin:0 0 10px; color:#316431; border-bottom:2px solid #f5f1ea; padding-bottom:5px;">Customer Details</h4>
            <p style="margin:5px 0; font-size:14px;"><strong>Name:</strong> ${name}</p>
            <p style="margin:5px 0; font-size:14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#316431; text-decoration:none;">${email}</a></p>
            <p style="margin:5px 0; font-size:14px;"><strong>Phone:</strong> ${phone}</p>
            ${orderType === 'delivery' ? `<p style="margin:5px 0; font-size:14px;"><strong>Address:</strong> ${address}</p>` : ''}
            ${notes ? `<p style="margin:10px 0; font-size:14px; background:#fff9e6; padding:15px; border-radius:8px; border-left:4px solid #f3b131;"><strong>Notes:</strong> ${notes}</p>` : ''}
            <h4 style="margin:25px 0 10px; color:#316431; border-bottom:2px solid #f5f1ea; padding-bottom:5px;">Items Ordered</h4>
            <table style="width:100%; border-collapse:collapse;">
              ${itemRows}
              <tr>
                <td style="padding:15px 0; font-weight:bold; font-size:16px;">Total Amount</td>
                <td style="padding:15px 0; text-align:right; font-weight:bold; font-size:16px; color:#316431;">£${total.toFixed(2)}</td>
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
    const meta    = session.metadata;

    let items = [];
    try {
      const rawJson = (meta.itemsJson || '') + (meta.itemsJson2 || '') + (meta.itemsJson3 || '');
      console.log(`[webhook] rawJson length: ${rawJson.length} chars`);
      items = JSON.parse(rawJson).map(i => ({
        name:     i.n,
        price:    i.p,
        quantity: i.q,
      }));
    } catch (e) {
      console.error('[webhook] Failed to parse itemsJson:', e.message);
      console.error('[webhook] chunk1:', meta.itemsJson);
      console.error('[webhook] chunk2:', meta.itemsJson2);
      console.error('[webhook] chunk3:', meta.itemsJson3);
    }

    const total = session.amount_total / 100;

    /* Save to Google Sheets */
    try {
      await appendOrder({
        orderId:        meta.orderId,
        status:         'paid',
        type:           meta.orderType,
        name:           meta.customerName,
        email:          session.customer_email,
        phone:          meta.customerPhone,
        address:        meta.address,
        items,
        total,
        notes:          meta.notes,
        collectionSlot: meta.collectionSlot,
      });
    } catch (e) {
      console.error('[webhook] Sheets error:', e.message);
    }

    /* Send Customer email */
    try {
      const customer = buildCustomerEmail({
        orderId:        meta.orderId,
        name:           meta.customerName,
        items,
        total,
        orderType:      meta.orderType,
        address:        meta.address,
        notes:          meta.notes,
        collectionSlot: meta.collectionSlot,
      });
      await resend.emails.send({
        from: `Root + Fuel <${FROM_CONFIRM}>`,
        to:   session.customer_email,
        ...customer,
      });
    } catch (e) {
      console.error('[webhook] Customer email error:', e.message);
    }

    /* Send Owner/Dev email */
    try {
      const owner = buildOwnerEmail({
        orderId:        meta.orderId,
        name:           meta.customerName,
        email:          session.customer_email,
        phone:          meta.customerPhone,
        items,
        total,
        orderType:      meta.orderType,
        address:        meta.address,
        notes:          meta.notes,
        collectionSlot: meta.collectionSlot,
      });
      await resend.emails.send({
        from: `Root + Fuel Orders <${FROM_ORDERS}>`,
        to:   [OWNER_EMAIL, DEV_EMAIL],
        ...owner,
      });
    } catch (e) {
      console.error('[webhook] Owner email error:', e.message);
    }
  }

  return res.json({ received: true });
}