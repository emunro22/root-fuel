import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ADMIN_PW = process.env.ADMIN_PASSWORD;

function auth(req) {
  return req.headers['x-admin-password'] === ADMIN_PW;
}

export default async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const codes = await stripe.promotionCodes.list({ limit: 100, expand: ['data.coupon'] });
      return res.json({ codes: codes.data });
    }

    if (req.method === 'POST') {
      const { code, type, amount, maxRedemptions, expiresAt, showOnSite } = req.body;
      if (!code?.trim()) return res.status(400).json({ error: 'Code is required' });
      if (!amount) return res.status(400).json({ error: 'Discount amount is required' });

      const couponData = type === 'percent'
        ? { percent_off: Number(amount), duration: 'once' }
        : { amount_off: Math.round(Number(amount) * 100), currency: 'gbp', duration: 'once' };

      const coupon = await stripe.coupons.create(couponData);

      const promoData = {
        coupon: coupon.id,
        code: code.trim().toUpperCase(),
        metadata: { public: showOnSite ? 'true' : 'false' },
      };
      if (maxRedemptions) promoData.max_redemptions = Number(maxRedemptions);
      if (expiresAt) promoData.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000);

      const promo = await stripe.promotionCodes.create(promoData);
      return res.json({ promo });
    }

    if (req.method === 'PATCH') {
      const { id, showOnSite } = req.body;
      const promo = await stripe.promotionCodes.update(id, {
        metadata: { public: showOnSite ? 'true' : 'false' },
      });
      return res.json({ promo });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const promo = await stripe.promotionCodes.update(id, { active: false });
      return res.json({ promo });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('Promo admin error:', err.message);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
