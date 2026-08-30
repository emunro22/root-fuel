import { blogPosts } from '../data/blogPosts';
import { SITE_URL } from '../lib/site';

function generateSitemap() {
  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${SITE_URL}/blog`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/privacy-policy`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${SITE_URL}/terms`, changefreq: 'yearly', priority: '0.2' },
  ];

  const postUrls = blogPosts.map(p => ({
    loc: `${SITE_URL}/blog/${p.slug}`,
    lastmod: p.date,
    changefreq: 'monthly',
    priority: '0.6',
  }));

  const urls = [...staticUrls, ...postUrls];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
      u => `  <url>
    <loc>${u.loc}</loc>
${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;
}

export default function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(generateSitemap());
  res.end();

  return { props: {} };
}
