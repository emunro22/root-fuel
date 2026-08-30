import { Resend } from 'resend';
import { CONTACT_EMAIL } from '../../lib/site';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_CONTACT = 'Root + Fuel <orders@rootandfuelltd.com>';

function buildOwnerEmail({ name, email, phone, message }) {
  return {
    subject: `📩 New website enquiry from ${name}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f5f1ea; padding:40px 10px;">
        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#316431; padding:30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">Root + Fuel</h1>
          </div>
          <div style="padding:30px;">
            <div style="background:#eef5ee; border-radius:12px; padding:20px; text-align:center; margin-bottom:25px;">
              <h2 style="margin:0; color:#316431; font-size:20px;">📩 New Website Enquiry</h2>
            </div>
            <p style="margin:5px 0; font-size:14px;"><strong>Name:</strong> ${name}</p>
            <p style="margin:5px 0; font-size:14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#316431; text-decoration:none;">${email}</a></p>
            <p style="margin:5px 0; font-size:14px;"><strong>Phone:</strong> ${phone || '—'}</p>
            <p style="margin:15px 0 0; font-size:14px; color:#333; background:#f9f9f9; padding:12px; border-radius:8px; line-height:1.5;">${message}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, message } = req.body || {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const owner = buildOwnerEmail({ name, email, phone, message });
    await resend.emails.send({ from: FROM_CONTACT, to: CONTACT_EMAIL, reply_to: email, ...owner });
  } catch (e) {
    console.error('[contact] Owner email error:', e.message);
    return res.status(500).json({ error: 'Could not send your message. Please try again or call us.' });
  }

  return res.status(200).json({ ok: true });
}
