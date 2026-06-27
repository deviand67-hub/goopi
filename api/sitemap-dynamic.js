export default async function handler(req, res) {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || 'https://mkhpjhihkzapfibxdokd.supabase.co',
    process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHBqaGloa3phcGZpYnhkb2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNDIyNjEsImV4cCI6MjA2MzgxODI2MX0.NLuBOmJB3GOHSVj6RPPMS9GSwfnbvW3xdqDfhF_bJIc'
  );

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, title, author, body_en, created_at')
    .order('created_at', { ascending: false });

  const base = 'https://www.thegoopi.com';

  function slugify(title, author){
    return (title+'-'+author).toLowerCase()
      .replace(/[^a-z0-9\s-]/g,'')
      .replace(/\s+/g,'-')
      .replace(/-+/g,'-')
      .trim();
  }

  const reviewUrls = (reviews || []).map(r => {
    const slug = slugify(r.title, r.author);
    const date = r.created_at?.slice(0,10) || new Date().toISOString().slice(0,10);
    const idUrl = `  <url>
    <loc>${base}/review/${slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    
    const enUrl = r.body_en ? `  <url>
    <loc>${base}/review/${slug}/en</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="id" href="${base}/review/${slug}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${base}/review/${slug}/en"/>
  </url>` : '';

    return idUrl + (enUrl ? '\n' + enUrl : '');
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
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
  <url>
    <loc>${base}/#contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
${reviewUrls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).send(sitemap);
}
