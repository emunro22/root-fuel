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

// Column G stores delivery days as a comma list, e.g. "tuesday". Blank means
// unassigned, which is treated as visible on every delivery day (keeps existing
// items showing up until an admin explicitly assigns them to a day). Legacy rows
// may still contain "friday" from when Friday delivery existed — those are no
// longer matched by any active delivery day, so they stop showing until re-tagged.
function parseDays(raw) {
  return (raw || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function formatDays(days) {
  return Array.isArray(days) ? days.map(d => d.trim().toLowerCase()).filter(Boolean).join(',') : (days || '');
}

export async function getMenuItems() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Menu!A2:G1000',
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
      days: parseDays(r[6]),
    }));
}

// Returns all menu rows (including unavailable) with their 1-based sheet row numbers
export async function getAllMenuRows() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Menu!A2:G1000',
  });
  const rows = res.data.values || [];
  return rows
    .map((r, i) => ({
      rowNumber: i + 2, // row 1 is header
      category: r[0] || '',
      name: r[1] || '',
      description: r[2] || '',
      price: parseFloat(r[3]) || 0,
      image: r[4] || '',
      available: (r[5] || '').toLowerCase() === 'yes',
      days: parseDays(r[6]),
    }))
    .filter(r => r.name); // skip truly blank rows
}

export async function addMenuRow({ category, name, description, price, image, available, days }) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Menu!A:G',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[category, name, description, price, image, available ? 'yes' : 'no', formatDays(days)]],
    },
  });
}

export async function updateMenuRow(rowNumber, { category, name, description, price, image, available, days }) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Menu!A${rowNumber}:G${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[category, name, description, price, image, available ? 'yes' : 'no', formatDays(days)]],
    },
  });
}

export async function deleteMenuRow(rowNumber) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Need numeric sheet ID for the Menu tab
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });
  const menuSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Menu');
  if (!menuSheet) throw new Error('Menu sheet not found');

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: menuSheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-based
            endIndex: rowNumber,       // exclusive
          },
        },
      }],
    },
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