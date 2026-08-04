// Follow-up "how did we do" email sent to delivery customers after their delivery day.
const REVIEW_LINK = 'https://g.page/r/CfJgYo7FQ2-9EBM/review';

// Returns the next occurrence of Tuesday (as a UK-calendar YYYY-MM-DD string)
// after today. Orders are always placed ahead of their delivery day, so this
// never resolves to today.
export function nextDeliveryDate() {
  const targetDow = 2; // Tue

  const ukDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = ukDateStr.split('-').map(Number);

  const date = new Date(Date.UTC(y, m - 1, d));
  do {
    date.setUTCDate(date.getUTCDate() + 1);
  } while (date.getUTCDay() !== targetDow);

  return date.toISOString().slice(0, 10);
}

export function todayUkDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function buildReviewFollowupEmail({ name, orderId }) {
  const firstName = (name || '').split(' ')[0] || 'there';

  return {
    subject: `How did we do, ${firstName}?`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color:#f5f1ea; padding:40px 10px;">
        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color:#316431; padding:30px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">Root + Fuel</h1>
          </div>
          <div style="padding:30px;">
            <div style="background:#eef5ee; border-radius:12px; padding:20px; text-align:center; margin-bottom:25px;">
              <h2 style="margin:0; color:#316431; font-size:20px;">🌱 How did we do?</h2>
              <p style="margin:10px 0 0; color:#444; font-size:14px;">Order ${orderId}</p>
            </div>
            <p style="margin:0 0 20px; color:#555; font-size:15px; line-height:1.6;">
              Hi ${name}, your Root + Fuel delivery should be with you now — we hope you enjoyed it!
            </p>
            <p style="margin:0 0 25px; color:#555; font-size:15px; line-height:1.6;">
              We're a small, local team and reviews mean the world to us. If you have a minute, we'd really appreciate you letting us know how it went.
            </p>
            <div style="text-align:center; margin-bottom:10px;">
              <a href="${REVIEW_LINK}" style="display:inline-block; background-color:#316431; color:#ffffff; text-decoration:none; font-weight:bold; font-size:15px; padding:14px 28px; border-radius:8px;">
                Leave us a review
              </a>
            </div>
            <p style="margin:20px 0 0; color:#999; font-size:12px; text-align:center;">
              Thank you for supporting Root + Fuel 💚
            </p>
          </div>
        </div>
      </div>
    `,
  };
}
