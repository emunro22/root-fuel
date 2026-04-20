// pages/api/checkout.js
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';

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

  // ── Collection override check ─────────────────────────────────────────────
  if (orderType === 'pickup') {
    const override = await kv.get('collection_override');
    if (override?.disabled) {
      return res.status(403).json({
        error: override.label || 'Collection is unavailable this week. Please try delivery or check back next week.',
      });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const orderId    = `ORD-${uuidv4().slice(0, 6).toUpperCase()}`;
  const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fee        = orderType === 'delivery' ? (deliveryFee || 2.99) : 0;
  const total      = itemsTotal + fee;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // ── Stash full order in KV — webhook will read this back ─────────────────
  // 24h TTL = abandoned carts auto-expire, nothing ever hits the Sheet.
  try {
    await kv.set(
      `pending_order:${orderId}`,
      {
        orderId,
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
      },
      { ex: 60 * 60 * 24 } // 24 hours
    );
  } catch (e) {
    console.error('[checkout] Failed to stash order in KV:', e.message);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
  // ─────────────────────────────────────────────────────────────────────────

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
      metadata: { orderId }, // tiny — just the ID, well under 500 chars
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
    // Clean up the stashed order since checkout failed
    await kv.del(`pending_order:${orderId}`).catch(() => {});
    res.status(500).json({ error: err.message });
  }
}