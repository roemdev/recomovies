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
  
  // Cargar las recomendaciones existentes al entrar
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

    // Mostrar solo las últimas 12
    const latest = recs.slice(0, 12);
    container.innerHTML = latest.map(m => {
      const poster = m.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w342${m.poster_path}" alt="${m.title}" loading="lazy" />`
        : `<div class="jf-poster-ph">🎬</div>`;
      const year = m.release_date ? m.release_date.slice(0, 4) : '—';

      return `
      <div class="jf-card already" title="Recomendada por ${m.recommended_by}">
        <div class="jf-poster-wrap">
          ${poster}
          <div class="badge-added">Añadida</div>
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
  
  // Manejo del botón limpiar
  if (val.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  if (!val.trim()) {
    document.getElementById('results-container').innerHTML = '';
    sp.classList.remove('active');
    resultsSec.classList.add('hidden');
    latestSec.classList.remove('hidden'); // Mostrar latest de nuevo
    return;
  }
  
  sp.classList.add('active');
  latestSec.classList.add('hidden'); // Ocultar latest
  resultsSec.classList.remove('hidden'); // Mostrar resultados
  
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
    const alreadyBadge = already ? `<div class="badge-added">Añadida</div>` : '';
    const alreadyClass = already ? ' already' : '';

    return `
    <div class="jf-card${alreadyClass}" onclick="${already ? '' : `selectMovie(${m.id})`}">
      <div class="jf-poster-wrap">
        ${poster}
        ${alreadyBadge}
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
function selectMovie(id) {
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
  const year = m.release_date ? m.release_date.slice(0, 4) : '—';
  const rating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';
  document.getElementById('confirm-meta').textContent = `${year} ${rating ? ' • ' + rating : ''}`;
  document.getElementById('confirm-overview').textContent = m.overview ? m.overview : 'Sin sinopsis disponible en la base de datos.';

  const fb = document.getElementById('confirm-feedback');
  fb.textContent = '';
  document.getElementById('confirm-btn').disabled = false;
  
  document.getElementById('confirm-panel').classList.remove('hidden');
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
      renderResults(Object.values(window._movieCache)); // Actualiza estado visual
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
  clearSearch(); // Limpia input y vuelve a pantalla default
  show('screen-search');
  loadLatestRecommendations(); // Refresca las últimas añadidas
}

// Enter key
document.getElementById('input-code')?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });
document.getElementById('input-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });