import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let cached = null;
let cachedAt = 0;
const TTL = 120_000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const now = Date.now();
    if (!cached || now - cachedAt > TTL) {
      const codes = await stripe.promotionCodes.list({ active: true, limit: 100, expand: ['data.coupon'] });
      cached = codes.data
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
      cachedAt = now;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.json({ codes: cached });
  } catch (err) {
    console.error('Promos fetch error:', err.message);
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
      return res.json({ codes: cached });
    }
    return res.json({ codes: [] });
  }
}
