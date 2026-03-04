import { Resend } from 'resend';
import { appendCateringEnquiry } from '../../lib/sheets';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ORDERS  = 'orders@rootandfuelltd.com';
const OWNER_EMAIL  = 'samanthahamilton@rootandfuelltd.com';
const DEV_EMAIL    = 'euanmunroo@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, eventDate, guestCount, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // 1. Log to Google Sheets ── NEW
  try {
    await appendCateringEnquiry({ name, email, phone, eventDate, guestCount, message });
  } catch (e) {
    console.error('Catering sheet error:', e);
  }

  // 2. Notify owner + dev
  try {
    await resend.emails.send({
      from:    `Root + Fuel Orders <${FROM_ORDERS}>`,
      to:      [OWNER_EMAIL, DEV_EMAIL],
      subject: `🍽️ New Catering Enquiry from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f5f5;padding:32px 16px;">
          <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
              <h1 style="color:#fff;font-size:20px;margin:0;">🍽️ New Catering Enquiry</h1>
            </div>
            <div style="padding:32px;">
              <div style="background:#eaf4e8;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
                <p style="margin:4px 0;color:#333;"><strong>Name:</strong> ${name}</p>
                <p style="margin:4px 0;color:#333;"><strong>Email:</strong> ${email}</p>
                <p style="margin:4px 0;color:#333;"><strong>Phone:</strong> ${phone || '—'}</p>
                <p style="margin:4px 0;color:#333;"><strong>Event Date:</strong> ${eventDate || '—'}</p>
                <p style="margin:4px 0;color:#333;"><strong>Guest Count:</strong> ${guestCount || '—'}</p>
              </div>
              <h3 style="color:#1a2418;margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Message</h3>
              <div style="background:#f9f7f4;border-radius:10px;padding:16px 18px;">
                <p style="margin:0;color:#555;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error('Owner catering email error:', e);
    return res.status(500).json({ error: 'Failed to send enquiry.' });
  }

  // 3. Auto-reply to customer
  try {
    await resend.emails.send({
      from:    `Root + Fuel <order-confirmation@rootandfuelltd.com>`,
      to:      email,
      subject: `We've received your catering enquiry, ${name}!`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f5f1ea;padding:32px 16px;">
          <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:#2d6b27;padding:32px 32px 24px;text-align:center;">
              <h1 style="color:#fff;font-size:26px;margin:0;font-weight:600;">Root + Fuel</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px;">Performance nutrition, rooted in nature</p>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1a2418;font-size:22px;margin:0 0 8px;">Thanks for your enquiry! 🍽️</h2>
              <p style="color:#555;margin:0 0 20px;line-height:1.7;">
                Hi ${name}, we've received your catering enquiry and will be in touch shortly to discuss your event.
              </p>
              <div style="background:#eaf4e8;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;color:#2d6b27;font-size:14px;line-height:1.7;">
                  In the meantime, feel free to reply to this email with any additional details about your event.
                </p>
              </div>
              <p style="color:#aaa;font-size:13px;margin:0;">— The Root + Fuel Team</p>
            </div>
            <div style="background:#1a1a1a;padding:20px 32px;text-align:center;">
              <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} Root + Fuel Ltd · Glasgow · Whole Food · Locally Sourced</p>
            </div>
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error('Customer catering auto-reply error:', e);
  }

  return res.status(200).json({ ok: true });
}