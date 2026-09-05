import { Resend } from 'resend';
import { appendCateringEnquiry } from '../../lib/sheets';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ENQUIRY = 'Root + Fuel <orders@rootandfuelltd.com>';
const OWNER_EMAIL   = 'samanthahamilton@rootandfuelltd.com';

function buildOwnerEmail({ name, email, phone, eventDate, guestCount, message }) {
  return {
    subject: `🍽️ New catering enquiry from ${name}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f5f1ea; padding:40px 10px;">
        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#316431; padding:30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">Root + Fuel</h1>
          </div>
          <div style="padding:30px;">
            <div style="background:#eef5ee; border-radius:12px; padding:20px; text-align:center; margin-bottom:25px;">
              <h2 style="margin:0; color:#316431; font-size:20px;">🍽️ New Catering Enquiry</h2>
            </div>
            <p style="margin:5px 0; font-size:14px;"><strong>Name:</strong> ${name}</p>
            <p style="margin:5px 0; font-size:14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#316431; text-decoration:none;">${email}</a></p>
            <p style="margin:5px 0; font-size:14px;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p style="margin:5px 0; font-size:14px;"><strong>Event date:</strong> ${eventDate || 'N/A'}</p>
            <p style="margin:5px 0; font-size:14px;"><strong>Guest count:</strong> ${guestCount || 'N/A'}</p>
            <p style="margin:15px 0 0; font-size:14px; color:#333; background:#f9f9f9; padding:12px; border-radius:8px; line-height:1.5;">${message}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, eventDate, guestCount, message } = req.body || {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await appendCateringEnquiry({ name, email, phone, eventDate, guestCount, message });
  } catch (e) {
    console.error('[catering-enquiry] Failed to write enquiry to Sheets:', e.message);
    return res.status(500).json({ error: 'Could not save your enquiry. Please try again.' });
  }

  try {
    const owner = buildOwnerEmail({ name, email, phone, eventDate, guestCount, message });
    await resend.emails.send({ from: FROM_ENQUIRY, to: OWNER_EMAIL, ...owner });
  } catch (e) {
    console.error('[catering-enquiry] Owner email error:', e.message);
    // Don't fail the request; the enquiry is already saved in Sheets
  }

  return res.status(200).json({ ok: true });
}
