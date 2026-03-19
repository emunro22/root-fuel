export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'No address provided' });

  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=gb`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'RootAndFuelApp/1.0 (samanthahamilton@rootandfuelltd.com)',
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.status(200).json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });

  } catch (err) {
    console.error('[geocode] Error:', err.message);
    return res.status(500).json({ error: 'Failed to geocode address' });
  }
}