export default async function handler(req, res) {
  const SUPABASE_URL = 'https://mkhpjhihkzapfibxdokd.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHBqaGloa3phcGZpYnhkb2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNDIyNjEsImV4cCI6MjA2MzgxODI2MX0.NLuBOmJB3GOHSVj6RPPMS9GSwfnbvW3xdqDfhF_bJIc';
  const base = 'https://www.thegoopi.com';

  function slugify(title, author) {
    return ((title || '') + '-' + (author || '')).toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  try {
    // Fetch all reviews - select only safe columns
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?select=id,title,author,created_at`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json'
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
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url></urlset>`);
  }
}
