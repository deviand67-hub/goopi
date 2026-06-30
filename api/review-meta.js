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

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function stripHtml(str) {
    return (str || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  try {
    const { slug, lang } = req.query;
    const isEn = lang === 'en';

    // Fetch only needed columns (no slug column in DB, so we match by computed slug in-memory)
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 6000);
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?select=title,author,cat,excerpt,excerpt_en,body,body_en,img,verdict,scoring,created_at`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept': 'application/json'
        },
        signal: controller1.signal
      }
    );
    clearTimeout(timeout1);
    if (!response.ok) {
      throw new Error(`Supabase fetch failed: ${response.status}`);
    }
    const reviews = await response.json();
    const list = Array.isArray(reviews) ? reviews : [];
    const r = list.find(item => slugify(item.title, item.author) === slug);

    if (req.query.debug === '1') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        requestedSlug: slug,
        matched: !!r,
        availableSlugs: list.map(item => ({ title: item.title, author: item.author, slug: slugify(item.title, item.author) }))
      });
    }

    // Fetch the static index.html via HTTP (avoids filesystem path issues in serverless runtime)
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 6000);
    const htmlRes = await fetch(`${base}/index.html`, { signal: controller2.signal });
    clearTimeout(timeout2);
    if (!htmlRes.ok) {
      throw new Error(`Failed to fetch index.html: ${htmlRes.status}`);
    }
    let html = await htmlRes.text();

    if (!r) {
      // Review not found, serve default HTML untouched
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    const title = r.title;
    const excerptRaw = isEn ? (r.excerpt_en || r.excerpt) : r.excerpt;
    const bodyRaw = isEn ? (r.body_en || r.body) : r.body;
    const description = stripHtml(excerptRaw || bodyRaw || '').slice(0, 160);
    const pageTitle = `${title} — Review ${r.cat === 'book' ? (isEn ? 'Book' : 'Buku') : r.cat === 'movie' ? 'Movie' : r.cat === 'series' ? 'Series' : ''} | GOOPI`;
    const image = r.img || `${base}/og-image.jpg`;
    const url = isEn ? `${base}/review/${slug}/en` : `${base}/review/${slug}`;
    const locale = isEn ? 'en_US' : 'id_ID';

    const verdictLabel = r.verdict === 'yes' ? 'Worth It' : r.verdict === 'no' ? 'Skip' : 'OK, But';
    const score = (r.scoring && r.scoring.total) || null;

    // Replace <title>
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`);

    // Replace meta description
    html = html.replace(
      /<meta name="description" content=".*?">/,
      `<meta name="description" content="${escapeHtml(description)}">`
    );

    // Replace canonical
    html = html.replace(
      /<link rel="canonical" href=".*?">/,
      `<link rel="canonical" href="${url}">`
    );

    // Replace OG tags
    html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${escapeHtml(pageTitle)}">`);
    html = html.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${url}">`);
    html = html.replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${escapeHtml(image)}">`);
    html = html.replace(/<meta property="og:locale" content=".*?">/, `<meta property="og:locale" content="${locale}">`);
    html = html.replace(/<meta property="og:type" content=".*?">/, `<meta property="og:type" content="article">`);

    // Replace Twitter tags
    html = html.replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}">`);
    html = html.replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta name="twitter:image" content=".*?">/, `<meta name="twitter:image" content="${escapeHtml(image)}">`);

    // Inject a visible noscript fallback + JSON-LD Review schema right after <body>
    const schemaType = r.cat === 'book' ? 'Book' : r.cat === 'series' ? 'TVSeries' : 'Movie';
    const authorProp = r.cat === 'book'
      ? `"author":{"@type":"Person","name":"${escapeHtml(r.author || '')}"},`
      : `"director":{"@type":"Person","name":"${escapeHtml(r.author || '')}"},`;
    const ratingValue = score ? (score / 20).toFixed(1) : '3';

    const reviewSchema = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "${schemaType}",
    "name": "${escapeHtml(r.title)}",
    ${authorProp}
    "image": "${escapeHtml(image)}"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "${ratingValue}",
    "bestRating": "5"
  },
  "author": {"@type": "Organization", "name": "GOOPI"},
  "reviewBody": "${escapeHtml(description)}",
  "datePublished": "${(r.created_at || '').slice(0,10)}"
}
</script>
<noscript>
<div style="padding:40px;font-family:sans-serif;max-width:700px;margin:0 auto">
<h1>${escapeHtml(title)}</h1>
<p><em>${escapeHtml(r.author || '')}</em> &mdash; ${escapeHtml(verdictLabel)}${score ? ' &middot; ' + score + '/100' : ''}</p>
<p>${escapeHtml(description)}</p>
<p>${escapeHtml(stripHtml(bodyRaw || '')).slice(0, 2000)}</p>
</div>
</noscript>`;

    html = html.replace('<body>', `<body>\n${reviewSchema}`);

    // Strip the admin panel section entirely from review pages — not relevant for public/crawler view
    const adminStart = html.indexOf('<div id="page-admin"');
    if (adminStart !== -1) {
      // Find the matching closing </div> using regex matchAll (fast, avoids char-by-char timeout)
      const tagRegex = /<div\b|<\/div>/g;
      tagRegex.lastIndex = adminStart;
      let depth = 0, adminEnd = -1, match;
      while ((match = tagRegex.exec(html)) !== null) {
        if (match[0] === '<div') depth++;
        else depth--;
        if (depth === 0) { adminEnd = match.index + match[0].length; break; }
      }
      if (adminEnd !== -1) {
        html = html.slice(0, adminStart) + html.slice(adminEnd);
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);

  } catch (error) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const msg = error.name === 'AbortError' ? 'Request timeout' : (error.message || 'Unknown error');
    return res.status(500).send(`<!DOCTYPE html><html><body>Error: ${msg}</body></html>`);
  }
}
