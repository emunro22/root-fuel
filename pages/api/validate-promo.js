import Stripe from 'stripe';
import { hasRedeemed } from '../../lib/promoRedemptions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, email } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter your email above before applying a code' });
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    if (await hasRedeemed(normalizedCode, email)) {
      return res.status(409).json({ error: "You've already redeemed this code" });
    }

    const promoCodes = await stripe.promotionCodes.list({
      code: normalizedCode,
      active: true,
      limit: 1,
    });

    if (promoCodes.data.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired promo code' });
    }

    const promo = promoCodes.data[0];
    const coupon = promo.coupon;

    return res.status(200).json({
      valid: true,
      code: normalizedCode,
      promotionCodeId: promo.id,
      discount: coupon.percent_off
        ? { type: 'percent', amount: coupon.percent_off }
        : { type: 'fixed',   amount: coupon.amount_off / 100 }, // pence → £
    });
  } catch (err) {
    console.error('Promo validation error:', err.message);
    return res.status(500).json({ error: 'Failed to validate code' });
  }
}