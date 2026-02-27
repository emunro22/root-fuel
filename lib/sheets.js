import { google } from 'googleapis';

function getAuth() {
  // Ensure private key newlines are real newlines, not escaped \n
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  // Strip surrounding quotes if present (common Windows .env.local issue)
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}


export async function getMenuItems() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Menu!A2:F1000',
  });
  const rows = res.data.values || [];
  return rows
    .filter(r => r[0] && r[1] && r[5]?.toLowerCase() === 'yes')
    .map(r => ({
      category: r[0],
      name: r[1],
      description: r[2] || '',
      price: parseFloat(r[3]) || 0,
      image: r[4] || '',
      available: true,
    }));
}

export async function appendOrder(order) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const now = new Date().toLocaleString('en-GB');
  const itemsStr = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Orders!A:K',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        now,
        order.orderId,
        order.status || 'pending_payment',
        order.type,
        order.name,
        order.email,
        order.phone || '',
        order.type === 'dine-in' ? `Table ${order.table}` : order.type === 'pickup' ? 'Pickup' : order.address,
        itemsStr,
        `£${order.total.toFixed(2)}`,
        order.notes || '—',
      ]],
    },
  });
}

export async function updateOrderStatus(orderId, status) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Orders!A:B',
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(r => r[1] === orderId);
  if (rowIndex === -1) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Orders!C${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status]] },
  });
}