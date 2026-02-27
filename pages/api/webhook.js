import Stripe from 'stripe';
import { updateOrderStatus } from '../../lib/sheets';
import { sendOrderConfirmation } from '../../lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const buf = await buffer(req);

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
    const meta = session.metadata;

    try { await updateOrderStatus(meta.orderId, 'paid ✅'); } catch (e) { console.error('Sheet update error:', e); }

    try {
      // Expand slim items back for the email
      const slimItems = JSON.parse(meta.itemsJson || '[]');
      const items = slimItems.map(i => ({ name: i.n, price: i.p, quantity: i.q }));
      await sendOrderConfirmation({
        orderId: meta.orderId,
        name: meta.customerName,
        email: session.customer_email,
        phone: meta.customerPhone,
        type: meta.orderType,
        table: meta.table,
        address: meta.address,
        notes: meta.notes,
        items,
        total: parseFloat(meta.total),
      });
    } catch (e) { console.error('Email error:', e); }
  }

  res.json({ received: true });
}