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
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?select=id,title,author,body_en,created_at&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    // Ensure data is array
    const reviews = Array.isArray(data) ? data : [];

    const reviewUrls = reviews.map(r => {
      const slug = slugify(r.title, r.author);
      const date = (r.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);

      let urls = `  <url>
    <loc>${base}/review/${slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

      if (r.body_en) {
        urls += `\n  <url>
    <loc>${base}/review/${slug}/en</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
      return urls;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/#about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${reviewUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).send(sitemap);

  } catch (error) {
    // Fallback — return basic sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(sitemap);
  }
}
