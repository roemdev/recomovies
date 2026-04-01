// Búsqueda de películas en TMDB

const tmdb = {
  posterUrl(path, size = 'w92') {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },

  async search(query) {
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('query', query);
    url.searchParams.set('language', CONFIG.TMDB_LANGUAGE);
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('api_key', CONFIG.TMDB_API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Error buscando en TMDB');
    const data = await res.json();
    return (data.results || []).slice(0, 7);
  }
};
