export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    res.status(400).end();
    return;
  }

  const decoded = decodeURIComponent(url);

  if (
    !decoded.includes('drive.google.com') &&
    !decoded.includes('googleusercontent.com')
  ) {
    res.status(403).end();
    return;
  }

  try {
    const response = await fetch(decoded, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      res.status(response.status).end();
      return;
    }

    const contentType =
      response.headers.get('content-type') || 'image/jpeg';

    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Image proxy error:', err.message);
    res.status(500).end();
  }
}