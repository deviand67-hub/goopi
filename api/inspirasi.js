export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { type } = req.query; // 'books' or 'movies'

  try {
    if (type === 'books') {
      // NYT Bestsellers - Combined Print & E-Book Fiction + Nonfiction
      const [fictionRes, nonfictionRes] = await Promise.all([
        fetch(`https://api.nytimes.com/svc/books/v3/lists/current/combined-print-and-e-book-fiction.json?api-key=${process.env.NYT_API_KEY}`),
        fetch(`https://api.nytimes.com/svc/books/v3/lists/current/combined-print-and-e-book-nonfiction.json?api-key=${process.env.NYT_API_KEY}`)
      ]);

      const [fiction, nonfiction] = await Promise.all([fictionRes.json(), nonfictionRes.json()]);

      const books = [
        ...(fiction.results?.books || []).slice(0, 5).map(b => ({
          title: b.title,
          author: b.author,
          description: b.description,
          cover: b.book_image,
          rank: b.rank,
          category: 'Fiction',
          weeksOnList: b.weeks_on_list,
          buyLink: b.amazon_product_url
        })),
        ...(nonfiction.results?.books || []).slice(0, 5).map(b => ({
          title: b.title,
          author: b.author,
          description: b.description,
          cover: b.book_image,
          rank: b.rank,
          category: 'Nonfiction',
          weeksOnList: b.weeks_on_list,
          buyLink: b.amazon_product_url
        }))
      ];

      return res.status(200).json({ success: true, data: books, updated: new Date().toISOString() });

    } else if (type === 'movies') {
      // TMDb Trending Movies this week
      const trendingRes = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}&language=en-US`
      );
      const trending = await trendingRes.json();

      const movies = (trending.results || []).slice(0, 10).map(m => ({
        title: m.title,
        overview: m.overview,
        cover: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        rating: m.vote_average,
        releaseDate: m.release_date,
        tmdbId: m.id,
        popularity: m.popularity
      }));

      return res.status(200).json({ success: true, data: movies, updated: new Date().toISOString() });

    } else if (type === 'series') {
      // TMDb Trending TV Series this week
      const seriesRes = await fetch(
        `https://api.themoviedb.org/3/trending/tv/week?api_key=${process.env.TMDB_API_KEY}&language=en-US`
      );
      const seriesData = await seriesRes.json();

      const series = (seriesData.results || []).slice(0, 10).map(s => ({
        title: s.name,
        overview: s.overview,
        cover: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
        rating: s.vote_average,
        releaseDate: s.first_air_date,
        tmdbId: s.id,
        popularity: s.popularity
      }));

      return res.status(200).json({ success: true, data: series, updated: new Date().toISOString() });

    } else if (type === 'indonesia') {
      // Indonesian movies from TMDb
      const indoRes = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_original_language=id&sort_by=popularity.desc&page=1`
      );
      const indoData = await indoRes.json();

      const movies = (indoData.results || []).slice(0, 10).map(m => ({
        title: m.title,
        overview: m.overview,
        cover: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        rating: m.vote_average,
        releaseDate: m.release_date,
        tmdbId: m.id,
        popularity: m.popularity
      }));

      return res.status(200).json({ success: true, movies, books: [], updated: new Date().toISOString() });

    } else {
      return res.status(400).json({ error: 'Invalid type. Use ?type=books, ?type=movies, or ?type=indonesia' });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
