import { google } from 'googleapis';

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
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

// All valid menu categories — add new ones here as the menu grows
const VALID_CATEGORIES = [
  'Starters',
  'Mains',
  'Desserts',
  'Overnight Oats',
  'Poke Bowls',
  'Grab & Go',
];

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
    // Only return rows whose category is one we recognise
    .filter(r => VALID_CATEGORIES.includes(r[0]))
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

  // Check if this orderId has already been written — prevents duplicate rows
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Orders!B:B', // orderId is column B
    });
    const existingIds = (existing.data.values || []).flat();
    if (existingIds.includes(order.orderId)) {
      console.log(`[sheets] Order ${order.orderId} already exists — skipping duplicate write.`);
      return;
    }
  } catch (e) {
    console.error('[sheets] Could not check for duplicate orderId:', e);
  }

  const now = new Date().toLocaleString('en-GB');
  const itemsStr = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

  // Build the type label — append slot time for collection orders
  let typeLabel;
  if (order.type === 'dine-in') {
    typeLabel = `Table ${order.table}`;
  } else if (order.type === 'pickup') {
    typeLabel = order.collectionSlot
      ? `Collection - ${order.collectionSlot}`
      : 'Collection';
  } else {
    typeLabel = order.address;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Orders!A:L',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        now,
        order.orderId,
        order.status || 'pending_payment',
        typeLabel,
        order.name,
        order.email,
        order.phone || '',
        typeLabel,
        itemsStr,
        `£${(order.total - (order.deliveryFee || 0)).toFixed(2)}`,
        order.deliveryFee ? `£${parseFloat(order.deliveryFee).toFixed(2)}` : '—',
        `£${order.total.toFixed(2)}`,
        order.notes || '—',
      ]],
    },
  });

  console.log(`[sheets] Order ${order.orderId} written successfully.`);
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

export async function appendCateringEnquiry({ name, email, phone, eventDate, guestCount, message }) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const now = new Date().toLocaleString('en-GB');

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Catering!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        now,
        name,
        email,
        phone || '—',
        eventDate || '—',
        guestCount || '—',
        message,
        'new enquiry',
      ]],
    },
  });
}