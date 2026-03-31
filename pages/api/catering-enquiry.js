import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { appendOrder } from '../../lib/sheets';

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

  // Save order to Sheets immediately as pending_payment
  // Webhook will update status to paid — no item data needed in Stripe metadata at all
  try {
    await appendOrder({
      orderId,
      status:         'pending_payment',
      type:           orderType,
      name:           customer.name,
      email:          customer.email,
      phone:          customer.phone || '',
      table:          table || '',
      address:        address || '',
      items,
      total,
      deliveryFee:    fee,
      notes:          notes || '',
      collectionSlot: collectionSlot || '',
    });
  } catch (e) {
    console.error('[checkout] Failed to write pending order to Sheets:', e.message);
    // Don't block checkout — Stripe webhook will still fire
  }

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
        orderId, // only thing we need — everything else is in Sheets
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
    console.error('[checkout] Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
}