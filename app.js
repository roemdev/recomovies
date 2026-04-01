// ── Estado ──────────────────────────────────────
let currentUser = '';
let selectedMovie = null;
let searchTimer = null;
let alreadyRecommendedIds = new Set();
window._movieCache = {};

// ── Pantallas ────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  target.classList.remove('hidden');
  target.classList.add('active');
}

// ── Login ────────────────────────────────────────
async function enterApp() {
  const name = document.getElementById('input-name').value.trim();
  const code = document.getElementById('input-code').value.trim();
  const errEl = document.getElementById('code-error');

  if (!name) { errEl.textContent = 'Escribe tu nombre de usuario.'; return; }
  if (code !== CONFIG.ACCESS_CODE) { errEl.textContent = 'Código incorrecto.'; return; }

  errEl.textContent = '';
  currentUser = name;

  const avatar = name.charAt(0).toUpperCase();
  document.getElementById('top-user-avatar').textContent = avatar;
  document.getElementById('top-user-name').textContent = name;
  
  show('screen-search');
  
  await loadLatestRecommendations();
}

function logoutToLogin() {
  currentUser = '';
  selectedMovie = null;
  document.getElementById('input-name').value = '';
  document.getElementById('input-code').value = '';
  clearSearch();
  show('screen-code');
}

// ── Recomendaciones Iniciales ────────────────────
async function loadLatestRecommendations() {
  const container = document.getElementById('latest-container');
  container.innerHTML = '<div class="empty-state">Sincronizando con el servidor...</div>';
  
  try {
    const recs = await db.getAll();
    alreadyRecommendedIds = new Set(recs.map(r => r.tmdb_id));
    
    if (recs.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay películas sugeridas aún. ¡Sé el primero!</div>';
      return;
    }

    const latest = recs.slice(0, 12);
    container.innerHTML = latest.map(m => {
      const poster = m.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w342${m.poster_path}" alt="${m.title}" loading="lazy" />`
        : `<div class="jf-poster-ph">🎬</div>`;
      const year = m.release_date ? m.release_date.slice(0, 4) : '—';

      return `
      <div class="jf-card" title="Añadida por ${m.recommended_by}">
        <div class="jf-poster-wrap">
          ${poster}
          <div class="badge-added">Sugerida</div>
        </div>
        <div class="jf-card-info">
          <div class="jf-card-title">${m.title}</div>
          <div class="jf-card-meta">${year}</div>
        </div>
      </div>`;
    }).join('');

  } catch (e) {
    container.innerHTML = '<div class="empty-state" style="color:var(--error-color);">Error de conexión con la base de datos.</div>';
    alreadyRecommendedIds = new Set();
  }
}

// ── Búsqueda ─────────────────────────────────────
function handleSearch(val) {
  clearTimeout(searchTimer);
  cancelConfirm();
  
  const sp = document.getElementById('spinner');
  const clearBtn = document.getElementById('clear-search-btn');
  const latestSec = document.getElementById('latest-section');
  const resultsSec = document.getElementById('search-results-section');
  
  if (val.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  if (!val.trim()) {
    document.getElementById('results-container').innerHTML = '';
    sp.classList.remove('active');
    resultsSec.classList.add('hidden');
    latestSec.classList.remove('hidden');
    return;
  }
  
  sp.classList.add('active');
  latestSec.classList.add('hidden');
  resultsSec.classList.remove('hidden');
  
  searchTimer = setTimeout(() => doSearch(val.trim()), 500);
}

function clearSearch() {
  const input = document.getElementById('search-input');
  input.value = '';
  handleSearch('');
  input.focus();
}

async function doSearch(q) {
  try {
    const movies = await tmdb.search(q);
    document.getElementById('spinner').classList.remove('active');
    renderResults(movies);
  } catch (e) {
    document.getElementById('spinner').classList.remove('active');
    document.getElementById('results-container').innerHTML =
      `<div class="empty-state" style="color:var(--error-color);">No se pudo conectar con TMDB.</div>`;
  }
}

function renderResults(movies) {
  const container = document.getElementById('results-container');
  if (!movies.length) {
    container.innerHTML = '<div class="empty-state">No se encontraron películas para esa búsqueda.</div>';
    return;
  }

  container.innerHTML = movies.map(m => {
    const already = alreadyRecommendedIds.has(m.id);
    const poster = m.poster_path
      ? `<img src="${tmdb.posterUrl(m.poster_path, 'w342')}" alt="${m.title}" loading="lazy" />`
      : `<div class="jf-poster-ph">🎬</div>`;
    
    const year = m.release_date ? m.release_date.slice(0, 4) : '—';
    const badge = already ? `<div class="badge-added">Ya añadida</div>` : '';
    const clickAction = already ? '' : `selectMovie(${m.id})`;

    return `
    <div class="jf-card" onclick="${clickAction}" style="${already ? 'cursor:default; opacity:0.6;' : ''}">
      <div class="jf-poster-wrap">
        ${poster}
        ${badge}
      </div>
      <div class="jf-card-info">
        <div class="jf-card-title" title="${m.title}">${m.title}</div>
        <div class="jf-card-meta">${year}</div>
      </div>
    </div>`;
  }).join('');

  movies.forEach(m => { window._movieCache[m.id] = m; });
}

// ── Selección y Modal ────────────────────────────
async function selectMovie(id) {
  selectedMovie = window._movieCache[id];
  if (!selectedMovie) return;

  const m = selectedMovie;
  const posterUrl = m.poster_path ? tmdb.posterUrl(m.poster_path, 'w500') : null;
  const backdropUrl = m.backdrop_path ? tmdb.posterUrl(m.backdrop_path, 'w1280') : null;

  const backdropEl = document.getElementById('confirm-backdrop');
  if (backdropUrl) {
    backdropEl.style.backgroundImage = `url(${backdropUrl})`;
  } else if (posterUrl) {
    backdropEl.style.backgroundImage = `url(${posterUrl})`;
  } else {
    backdropEl.style.backgroundImage = 'none';
  }

  const posterEl = document.getElementById('confirm-poster');
  if (posterUrl) {
    posterEl.src = posterUrl;
    posterEl.style.display = 'block';
  } else {
    posterEl.style.display = 'none';
  }

  document.getElementById('confirm-title').textContent = m.title;
  
  document.getElementById('confirm-tagline').textContent = '';
  document.getElementById('confirm-cast').textContent = 'Cargando reparto...';
  document.getElementById('confirm-trailer-btn').style.display = 'none';

  const baseYear = m.release_date ? m.release_date.slice(0, 4) : '—';
  const baseRating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';
  
  document.getElementById('confirm-meta').innerHTML = `${baseYear} • ${baseRating} <span style="opacity:0.5; margin-left:10px;">Cargando información ampliada...</span>`;
  document.getElementById('confirm-overview').textContent = m.overview ? m.overview : 'Sin sinopsis disponible en la base de datos.';

  const fb = document.getElementById('confirm-feedback');
  fb.textContent = '';
  document.getElementById('confirm-btn').disabled = false;
  
  document.getElementById('confirm-panel').classList.remove('hidden');

  try {
    const details = await tmdb.getMovieDetails(m.id);
    
    if (details.tagline) {
      document.getElementById('confirm-tagline').textContent = `"${details.tagline}"`;
    }

    const runtime = details.runtime ? `${details.runtime} min` : '';
    const formatMoney = num => num > 0 ? '$' + num.toLocaleString('en-US') : '';
    const budget = details.budget ? `Presupuesto: ${formatMoney(details.budget)}` : '';
    const revenue = details.revenue ? `Ingresos: ${formatMoney(details.revenue)}` : '';
    const genres = details.genres ? details.genres.map(g => g.name).join(', ') : '';
    
    let cert = '';
    if (details.release_dates && details.release_dates.results) {
       const release = details.release_dates.results.find(r => r.iso_3166_1 === 'ES' || r.iso_3166_1 === 'MX' || r.iso_3166_1 === 'US');
       if (release && release.release_dates.length > 0 && release.release_dates[0].certification) {
          cert = `<span style="border: 1px solid var(--text-muted); padding: 1px 6px; border-radius: 4px; font-size: 0.8em; margin: 0 4px;">${release.release_dates[0].certification}</span>`;
       }
    }

    const metaArray = [baseYear, cert, runtime, baseRating].filter(Boolean);
    let extraInfoHtml = `<div style="margin-bottom: 6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">${metaArray.join(' • ')}</div>
      <div style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 4px;">${genres}</div>`;
      
    if (budget || revenue) {
      const moneyData = [budget, revenue].filter(Boolean).join(' • ');
      extraInfoHtml += `<div style="color: var(--text-muted); font-size: 0.85em; opacity: 0.8;">${moneyData}</div>`;
    }

    document.getElementById('confirm-meta').innerHTML = extraInfoHtml;

    if (details.credits && details.credits.cast) {
      const topCast = details.credits.cast.slice(0, 5).map(c => c.name).join(', ');
      document.getElementById('confirm-cast').textContent = topCast || 'Información de reparto no disponible.';
    } else {
      document.getElementById('confirm-cast').textContent = 'Información de reparto no disponible.';
    }

    if (details.videos && details.videos.results) {
      const youtubeVideos = details.videos.results.filter(v => v.site === 'YouTube');
      const trailer = youtubeVideos.find(v => v.type === 'Trailer') || youtubeVideos.find(v => v.type === 'Teaser') || youtubeVideos[0];
      
      if (trailer) {
        const trailerBtn = document.getElementById('confirm-trailer-btn');
        trailerBtn.href = `https://www.youtube.com/watch?v=${trailer.key}`;
        trailerBtn.style.display = 'inline-flex';
      }
    }

  } catch(e) {
    document.getElementById('confirm-meta').textContent = `${baseYear} • ${baseRating}`;
    document.getElementById('confirm-cast').textContent = 'Error al cargar la información.';
  }
}

function cancelConfirm() {
  selectedMovie = null;
  document.getElementById('confirm-panel').classList.add('hidden');
}

async function submitRecommendation() {
  if (!selectedMovie) return;

  const fb = document.getElementById('confirm-feedback');
  const btn = document.getElementById('confirm-btn');
  btn.disabled = true;

  try {
    const alreadyExists = await db.exists(selectedMovie.id);
    if (alreadyExists) {
      fb.textContent = 'Alguien ya sugirió esta película. Elige otra.';
      alreadyRecommendedIds.add(selectedMovie.id);
      renderResults(Object.values(window._movieCache));
      btn.disabled = false;
      return;
    }

    await db.insert({
      tmdb_id: selectedMovie.id,
      title: selectedMovie.title,
      poster_path: selectedMovie.poster_path || null,
      release_date: selectedMovie.release_date || null,
      vote_average: selectedMovie.vote_average || null,
      overview: selectedMovie.overview || null,
      recommended_by: currentUser,
    });

    alreadyRecommendedIds.add(selectedMovie.id);

    document.getElementById('success-msg').textContent = `"${selectedMovie.title}" ha sido agregada a la lista.`;
    cancelConfirm();
    show('screen-success');

  } catch (e) {
    fb.textContent = 'Ocurrió un error de red. Intenta nuevamente.';
    btn.disabled = false;
  }
}

function recomendar() {
  selectedMovie = null;
  clearSearch();
  show('screen-search');
  loadLatestRecommendations();
}

document.getElementById('input-code')?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });
document.getElementById('input-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });