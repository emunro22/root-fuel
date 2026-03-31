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

const VALID_CATEGORIES = [
  'Starters',
  'Mains',
  'Desserts',
  'Overnight Oats',
  'Poke Bowls',
  'Grab & Go',
  'Specials'
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

  // Check for duplicate orderId
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Orders!B:B',
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

  // Store full items JSON in column M so webhook can retrieve it
  const itemsJson = JSON.stringify(order.items);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Orders!A:M',
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
        (order.total - (order.deliveryFee || 0)).toFixed(2),
        order.deliveryFee ? parseFloat(order.deliveryFee).toFixed(2) : '—',
        order.total.toFixed(2),
        order.notes || '—',
        itemsJson,   // column M — full items, read back by webhook
      ]],
    },
  });

  console.log(`[sheets] Order ${order.orderId} written with status: ${order.status}`);
}

export async function getOrderById(orderId) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Orders!A:N',
  });

  const rows = res.data.values || [];
  const row = rows.find(r => r[1] === orderId);
  if (!row) return null;

  let items = [];
  try {
    items = JSON.parse(row[13] || '[]');
  } catch (e) {
    console.error('[sheets] Failed to parse items from row:', e.message);
  }

  return {
    orderId:        row[1],
    status:         row[2],
    typeLabel:      row[3],
    name:           row[4],
    email:          row[5],
    phone:          row[6],
    itemsStr:       row[8],
    subtotal:       row[9],
    deliveryFee:    row[10],
    total:          parseFloat(row[11]) || 0,
    notes:          row[12],
    items,
    // Derive orderType and collectionSlot from typeLabel
    orderType:      row[3]?.startsWith('Collection') ? 'pickup'
                  : row[3]?.startsWith('Table')       ? 'dine-in'
                  : 'delivery',
    collectionSlot: row[3]?.startsWith('Collection - ')
                  ? row[3].replace('Collection - ', '')
                  : null,
    address:        (!row[3]?.startsWith('Collection') && !row[3]?.startsWith('Table'))
                  ? row[3]
                  : null,
  };
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

  console.log(`[sheets] Order ${orderId} status updated to: ${status}`);
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