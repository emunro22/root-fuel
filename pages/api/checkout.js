import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function isOrderingLocked() {
  const now = new Date();
  const ukParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const day  = ukParts.find(p => p.type === 'weekday')?.value;
  const hour = parseInt(ukParts.find(p => p.type === 'hour')?.value   || '0', 10);
  const min  = parseInt(ukParts.find(p => p.type === 'minute')?.value || '0', 10);
  const sec  = parseInt(ukParts.find(p => p.type === 'second')?.value || '0', 10);
  if (day === 'Sun' || day === 'Mon' || day === 'Tue') return true;
  if (day === 'Sat' && hour === 23 && min === 59 && sec === 59) return true;
  return false;
}

export default async function handler(req, res) {
  console.log('Stripe key:', process.env.STRIPE_SECRET_KEY?.slice(0, 14));
  if (req.method !== 'POST') return res.status(405).end();
  if (isOrderingLocked()) {
    return res.status(403).json({
      error: 'Ordering is currently closed. Orders are accepted Wednesday through Saturday midnight for Tuesday collection or delivery.',
    });
  }

  const { items, customer, orderType, table, address, notes, promotionCodeId, deliveryFee, collectionSlot } = req.body;

  if (!items?.length || !customer?.email || !customer?.name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const orderId    = `ORD-${uuidv4().slice(0, 6).toUpperCase()}`;
  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fee        = orderType === 'delivery' ? (deliveryFee || 2.99) : 0;
  const total      = itemsTotal + fee;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const slimItems   = items.map(i => ({ n: i.name.slice(0, 30), p: i.price, q: i.quantity }));
  const itemsJson   = JSON.stringify(slimItems);

  console.log(`[checkout] itemsJson length: ${itemsJson.length} chars`);

  const itemsChunk1 = itemsJson.slice(0,    490);
  const itemsChunk2 = itemsJson.slice(490,  980);
  const itemsChunk3 = itemsJson.slice(980, 1470);

  const lineItems = items.map(item => ({
    price_data: {
      currency: 'gbp',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  if (orderType === 'delivery' && fee > 0) {
    lineItems.push({
      price_data: {
        currency: 'gbp',
        product_data: { name: 'Delivery Fee' },
        unit_amount: Math.round(fee * 100),
      },
      quantity: 1,
    });
  }

  try {
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer.email,
      metadata: {
        orderId,
        customerName:   customer.name.slice(0, 100),
        customerPhone:  (customer.phone  || '').slice(0, 20),
        orderType,
        table:          (table          || '').slice(0, 50),
        address:        (address        || '').slice(0, 200),
        notes:          (notes          || '').slice(0, 200),
        itemsJson:      itemsChunk1,
        itemsJson2:     itemsChunk2,
        itemsJson3:     itemsChunk3,
        total:          total.toFixed(2),
        deliveryFee:    fee.toFixed(2),
        collectionSlot: (collectionSlot || '').slice(0, 20),
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url:  `${appUrl}/?cancelled=true`,
    };

    if (promotionCodeId) {
      sessionParams.discounts = [{ promotion_code: promotionCodeId }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
}