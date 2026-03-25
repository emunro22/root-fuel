import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOrderConfirmation(order) {
  const itemsHtml = order.items
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e8f0e8;">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8f0e8;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e8f0e8;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>`)
    .join('');

  const typeLabel = order.type === 'dine-in'
    ? `Dine In — Table ${order.table}`
    : order.type === 'pickup'
    ? order.collectionSlot
      ? `Collection — ${order.collectionSlot} slot`
      : 'Collection'
    : `Delivery to: ${order.address}`;

  const collectionInfoHtml = order.type === 'pickup' ? `
    <div style="background:#f5f8f3;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #2d5a27;">
      <p style="margin:0 0 12px;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Collection Information</p>
      <p style="margin:0 0 12px;color:#333;font-size:15px;line-height:1.6;"><strong style="color:#2d5a27;">Collection slots: 13:00, 16:00 and 17:00</strong> — please confirm your preferred slot today.</p>
      <p style="margin:0 0 12px;color:#333;font-size:15px;line-height:1.6;">We ask that you arrive on time, but appreciate delays can happen — just send us a DM on Instagram so we know whether to put your order back in the fridge.</p>
      <p style="margin:0 0 16px;color:#b07800;font-size:14px;line-height:1.6;font-weight:bold;background:#fff8e7;padding:10px 14px;border-radius:6px;border-left:3px solid #e8a020;">Please do not arrive before your slot — food is made to order and will not be bagged.</p>
      <div style="background:#fff;border-radius:6px;padding:14px 16px;margin-bottom:14px;">
        <p style="margin:0 0 6px;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Collection Address</p>
        <p style="margin:0;color:#2d5a27;font-size:15px;font-weight:bold;line-height:1.8;">All Tots Nursery<br>64 Cowdenhill Road<br>G13 2HE</p>
      </div>
      <p style="margin:0 0 10px;color:#333;font-size:15px;line-height:1.6;">We have a small car park — message the page to confirm your arrival and we will bring your food out to you.</p>
      <p style="margin:0;color:#b07800;font-size:14px;line-height:1.6;font-weight:bold;background:#fff8e7;padding:10px 14px;border-radius:6px;border-left:3px solid #e8a020;">Please do not ring the bell — it belongs to the nursery next door and we will not hear it.</p>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f8f3;font-family:'Georgia',serif;">
      <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:#2d5a27;padding:40px 32px;text-align:center;">
          <h1 style="margin:0;color:#f5f8f3;font-size:28px;letter-spacing:2px;">ROOT·FUEL</h1>
          <p style="margin:8px 0 0;color:#a8c5a0;font-size:13px;letter-spacing:1px;">PERFORMANCE NUTRITION · ROOTED IN NATURE</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#2d5a27;margin:0 0 8px;font-size:22px;">Order Confirmed!</h2>
          <p style="color:#555;margin:0 0 24px;">Thanks ${order.name}, we've received your order.</p>
          
          <div style="background:#f5f8f3;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Order ID</p>
            <p style="margin:0;font-size:18px;font-weight:bold;color:#2d5a27;font-family:monospace;">${order.orderId}</p>
          </div>

          <div style="background:#f5f8f3;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:13px;color:#888;letter-spacing:1px;text-transform:uppercase;">Order Type</p>
            <p style="margin:0;color:#333;font-size:16px;">${typeLabel}</p>
          </div>

          ${collectionInfoHtml}

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr style="background:#2d5a27;">
                <th style="padding:10px 12px;text-align:left;color:#f5f8f3;font-size:13px;font-weight:normal;letter-spacing:1px;">ITEM</th>
                <th style="padding:10px 12px;text-align:center;color:#f5f8f3;font-size:13px;font-weight:normal;letter-spacing:1px;">QTY</th>
                <th style="padding:10px 12px;text-align:right;color:#f5f8f3;font-size:13px;font-weight:normal;letter-spacing:1px;">PRICE</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:12px;font-weight:bold;color:#2d5a27;font-size:16px;">Total</td>
                <td style="padding:12px;font-weight:bold;color:#2d5a27;font-size:18px;text-align:right;">£${order.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${order.notes ? `<div style="background:#fff8e7;border-left:4px solid #e8a020;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#888;">NOTES</p>
            <p style="margin:4px 0 0;color:#333;">${order.notes}</p>
          </div>` : ''}

          <p style="color:#888;font-size:14px;text-align:center;margin:0;">Questions? Contact us on Instagram @rootandfuel</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.email,
    subject: `Root & Fuel — Order Confirmed (${order.orderId})`,
    html,
  });
}