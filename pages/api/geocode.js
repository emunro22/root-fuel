// pages/api/geocode.js

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const HEADERS = {
  'Accept-Language': 'en',
  'User-Agent': 'RootAndFuelApp/1.0 (samanthahamilton@rootandfuelltd.com)',
};

const UK_POSTCODE_REGEX = /([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i;

/**
 * Extract a UK postcode from an address string, if present.
 */
function extractPostcode(address) {
  const match = address.match(UK_POSTCODE_REGEX);
  return match ? match[1].trim().toUpperCase() : null;
}

/**
 * Strip flat/apartment prefixes that confuse Nominatim.
 * e.g. "Flat 2/1, 12 Main Street" → "12 Main Street"
 */
function stripFlatPrefix(address) {
  return address
    .replace(/^(flat|apartment|apt|unit|house)\s+[\w/\-]+[,\s]+/i, '')
    .trim();
}

/**
 * Extract a rough street + house number from the address.
 * Returns the first line before a comma, stripped of flat prefix.
 */
function extractStreetLine(address) {
  const firstLine = address.split(',')[0].trim();
  return stripFlatPrefix(firstLine);
}

/**
 * Try a single Nominatim fetch. Returns { lat, lng, display_name } or null.
 */
async function tryNominatim(params) {
  const qs = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'gb', ...params });
  const res = await fetch(`${NOMINATIM_BASE}?${qs}`, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  };
}

/**
 * Try multiple strategies in order, returning the first hit.
 */
async function geocodeWithFallbacks(address) {
  const postcode = extractPostcode(address);
  const street   = extractStreetLine(address);

  const strategies = [];

  // 1. Structured query: street + postcode (best for Nominatim)
  if (street && postcode) {
    strategies.push({ street, postalcode: postcode });
  }

  // 2. Structured query: street only
  if (street) {
    strategies.push({ street, countrycodes: 'gb' });
  }

  // 3. Free-text with flat prefix stripped
  const stripped = stripFlatPrefix(address);
  if (stripped !== address) {
    strategies.push({ q: stripped });
  }

  // 4. Original full address free-text
  strategies.push({ q: address });

  // 5. Postcode only — least precise but nearly always works,
  //    good enough for a 15-mile radius check
  if (postcode) {
    strategies.push({ q: postcode });
  }

  for (const params of strategies) {
    // Nominatim asks for 1 req/sec between calls
    const result = await tryNominatim(params);
    if (result) return result;
    await new Promise(r => setTimeout(r, 1100));
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'No address provided' });

  try {
    const result = await geocodeWithFallbacks(address);

    if (!result) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[geocode] Error:', err.message);
    return res.status(500).json({ error: 'Failed to geocode address' });
  }
}