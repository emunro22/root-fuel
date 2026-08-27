import { kv } from '@vercel/kv';

function redemptionKey(code, email) {
  return `promo_redeemed:${code.trim().toUpperCase()}:${email.trim().toLowerCase()}`;
}

export async function hasRedeemed(code, email) {
  if (!code || !email) return false;
  return !!(await kv.get(redemptionKey(code, email)));
}

export async function recordRedemption(code, email, orderId) {
  if (!code || !email) return;
  await kv.set(redemptionKey(code, email), orderId);
}
