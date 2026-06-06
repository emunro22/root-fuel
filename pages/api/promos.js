import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const codes = await stripe.promotionCodes.list({ active: true, limit: 100, expand: ['data.coupon'] });
    const publicCodes = codes.data
      .filter(c => c.metadata?.public === 'true')
      .map(c => ({
        code: c.code,
        discount: c.coupon.percent_off
          ? { type: 'percent', amount: c.coupon.percent_off }
          : { type: 'fixed', amount: c.coupon.amount_off / 100 },
        expiresAt: c.expires_at || null,
        timesRedeemed: c.times_redeemed,
        maxRedemptions: c.max_redemptions || null,
      }));

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ codes: publicCodes });
  } catch (err) {
    console.error('Promos fetch error:', err.message);
    return res.json({ codes: [] });
  }
}
