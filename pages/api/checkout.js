// pages/api/checkout.js
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';
import { getMenuItems } from '../../lib/sheets';
import { hasRedeemed } from '../../lib/promoRedemptions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const MIN_MILES_FOR_MINIMUM_ORDER = 5;
const MINIMUM_ORDER_BEYOND_5_MILES = 30.00;

function isOrderingLocked() {
  const now = new Date();
  const ukParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);
  const day = ukParts.find(p => p.type === 'weekday')?.value;

  // Tuesday delivery: open Wed → Fri midnight
  return day === 'Sun' || day === 'Mon' || day === 'Tue' || day === 'Sat';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items, customer, orderType, table, address, notes, promoCode, promotionCodeId, deliveryFee, collectionSlot, deliveryDay, distanceMiles } = req.body;

  if (isOrderingLocked()) {
    return res.status(403).json({ error: 'Tuesday delivery ordering is closed. Orders for Tuesday are accepted Wednesday through Friday midnight.' });
  }

  if (!items?.length || !customer?.email || !customer?.name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Re-check redemption server-side; the /api/validate-promo check happens
  // client-side when the code is applied, but nothing stops a request from
  // reaching this endpoint with a promotionCodeId that was never re-verified.
  if (promoCode && promotionCodeId) {
    if (await hasRedeemed(promoCode, customer.email)) {
      return res.status(409).json({ error: "You've already redeemed this promo code." });
    }
  }

  // ── Re-validate cart items against the live menu ──────────────────────────
  // Carts persist in the browser's localStorage for up to 7 days, and the
  // menu is only fetched once per page load. If the Sheet changes (new week's
  // menu) while a stale cart or tab is still around, the client could submit
  // items/prices that no longer exist on the live menu. Reject those here
  // rather than trusting whatever the browser sends.
  let liveMenu;
  try {
    liveMenu = await getMenuItems();
  } catch (e) {
    console.error('[checkout] Failed to load live menu for validation:', e.message);
    return res.status(500).json({ error: 'Could not verify menu. Please try again.' });
  }
  const liveByName = new Map(liveMenu.map(m => [m.name, m]));
  const staleItems = items.filter(i => {
    const live = liveByName.get(i.name);
    return !live || Math.abs(live.price - i.price) > 0.001;
  });
  if (staleItems.length) {
    return res.status(409).json({
      error: 'Some items in your cart are no longer on the current menu, so we removed them. Please review your order and try again.',
      staleItems: staleItems.map(i => i.name),
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (orderType === 'delivery' && distanceMiles != null && distanceMiles > MIN_MILES_FOR_MINIMUM_ORDER) {
    const itemsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (itemsTotal < MINIMUM_ORDER_BEYOND_5_MILES) {
      return res.status(400).json({ error: `A minimum order of £${MINIMUM_ORDER_BEYOND_5_MILES.toFixed(2)} is required for delivery beyond ${MIN_MILES_FOR_MINIMUM_ORDER} miles.` });
    }
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

  // ── Stash full order in KV: webhook will read this back ─────────────────
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
        deliveryDay:    deliveryDay || 'Tuesday',
        promoCode:      promoCode || '',
        promotionCodeId: promotionCodeId || null,
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
      metadata: { orderId }, // tiny, just the ID, well under 500 chars
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