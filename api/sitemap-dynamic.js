export default async function handler(req, res) {
  const SUPABASE_URL = 'https://mkhpjhihkzapfibxdokd.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHBqaGloa3phcGZpYnhkb2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzAzMjUsImV4cCI6MjA5Nzg0NjMyNX0.y0YzaTZ1NqXjktugCJRHdrDw9VJ1zVJ4on_EZ4vTlFA';
  const base = 'https://www.thegoopi.com';

  function slugify(title, author) {
    return ((title || '') + '-' + (author || '')).toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Debug mode
  if (req.query.debug === '1') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=id,title,author&limit=3`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' }
    });
    const d = await r.json();
    return res.status(200).json({ status: r.status, data: d });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?select=id,title,author,created_at&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    const data = await response.json();
    const reviews = Array.isArray(data) ? data : [];

    const reviewUrls = reviews.map(r => {
      const slug = slugify(r.title, r.author);
      const date = (r.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      return `  <url>\n    <loc>${base}/review/${slug}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${base}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n${reviewUrls}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).send(sitemap);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
