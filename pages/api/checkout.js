import Stripe from 'stripe';
import { appendOrder } from '../../lib/sheets';
import { v4 as uuidv4 } from 'uuid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items, customer, orderType, table, address, notes } = req.body;

  if (!items?.length || !customer?.email || !customer?.name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const orderId = `ORD-${uuidv4().slice(0, 6).toUpperCase()}`;
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Slim down items for metadata - only store name, price, quantity (stay under 500 chars)
  const slimItems = items.map(i => ({ n: i.name, p: i.price, q: i.quantity }));
  const itemsJson = JSON.stringify(slimItems);

  const lineItems = items.map(item => ({
    price_data: {
      currency: 'gbp',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  try {
    // Pre-append order to Google Sheets before Stripe redirect
    await appendOrder({
      orderId,
      status: 'paid ✅',
      type: orderType,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      table,
      address,
      items,
      total,
      notes,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer.email,
      metadata: {
        orderId,
        customerName: customer.name.slice(0, 100),
        customerPhone: (customer.phone || '').slice(0, 20),
        orderType,
        table: (table || '').slice(0, 50),
        address: (address || '').slice(0, 200),
        notes: (notes || '').slice(0, 200),
        itemsJson: itemsJson.slice(0, 490),
        total: total.toFixed(2),
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${appUrl}/?cancelled=true`,
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
}