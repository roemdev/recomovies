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
    return (data.results || []).slice(0, 10);
  },

  // Nueva función para extraer más detalles como la duración, géneros y clasificación PEGI
  async getMovieDetails(id) {
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
    url.searchParams.set('language', CONFIG.TMDB_LANGUAGE);
    url.searchParams.set('api_key', CONFIG.TMDB_API_KEY);
    // Agregamos release_dates para conseguir la clasificación por edad
    url.searchParams.set('append_to_response', 'release_dates');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Error al obtener los detalles');
    return await res.json();
  }
};