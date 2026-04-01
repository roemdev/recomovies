// ── Temas ────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('recomovies-theme') || 'jellyfin';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const select = document.getElementById('theme-select');
  if(select) select.value = savedTheme;
}

function changeTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('recomovies-theme', theme);
}

// Inicializar tema al cargar
initTheme();

// ── Estado ──────────────────────────────────────
let currentUser = '';
let selectedMovie = null;
let searchTimer = null;
let alreadyRecommendedIds = new Set();

// ── Pantallas ────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Login con código ─────────────────────────────
async function enterApp() {
  const name = document.getElementById('input-name').value.trim();
  const code = document.getElementById('input-code').value.trim();
  const errEl = document.getElementById('code-error');

  if (!name) { errEl.textContent = 'Escribe tu nombre.'; return; }
  if (code !== CONFIG.ACCESS_CODE) { errEl.textContent = 'Código incorrecto. Pídele el código a tu amigo.'; return; }

  errEl.textContent = '';
  currentUser = name;

  // Precarga IDs ya recomendados
  try {
    const recs = await db.getAll();
    alreadyRecommendedIds = new Set(recs.map(r => r.tmdb_id));
  } catch (e) {
    alreadyRecommendedIds = new Set();
  }

  const avatar = name.charAt(0).toUpperCase();
  document.getElementById('top-user-avatar').textContent = avatar;
  document.getElementById('top-user-name').textContent = name;
  
  show('screen-search');
  document.getElementById('search-input').focus();
}

function logoutToLogin() {
  currentUser = '';
  selectedMovie = null;
  document.getElementById('input-name').value = '';
  document.getElementById('input-code').value = '';
  document.getElementById('search-input').value = '';
  document.getElementById('results-container').innerHTML = '';
  show('screen-code');
}

// ── Búsqueda ─────────────────────────────────────
function handleSearch(val) {
  clearTimeout(searchTimer);
  cancelConfirm();
  const sp = document.getElementById('spinner');
  if (!val.trim()) {
    document.getElementById('results-container').innerHTML = '';
    sp.classList.remove('active');
    return;
  }
  sp.classList.add('active');
  searchTimer = setTimeout(() => doSearch(val.trim()), 420);
}

async function doSearch(q) {
  try {
    const movies = await tmdb.search(q);
    document.getElementById('spinner').classList.remove('active');
    renderResults(movies);
  } catch (e) {
    document.getElementById('spinner').classList.remove('active');
    document.getElementById('results-container').innerHTML =
      `<div class="empty-state" style="color:var(--error-color);">Error conectando con TMDB. Verifica tu API key en config.js.</div>`;
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
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--panel-bg)">🎬</div>`;
    
    const year = m.release_date ? m.release_date.slice(0, 4) : '—';
    const alreadyBadge = already ? `<div class="badge-added">Añadida</div>` : '';
    const alreadyClass = already ? ' already' : '';

    return `
    <div class="movie-card${alreadyClass}" onclick="${already ? '' : `selectMovie(${m.id})`}" data-id="${m.id}">
      <div class="card-poster-wrap">
        ${poster}
        <div class="card-overlay"><div class="play-icon">▶</div></div>
        ${alreadyBadge}
      </div>
      <div class="card-info">
        <h3 class="card-title" title="${m.title}">${m.title}</h3>
        <p class="card-meta">${year}</p>
      </div>
    </div>`;
  }).join('');

  // Guardar datos en memoria para el confirm
  window._movieCache = {};
  movies.forEach(m => { window._movieCache[m.id] = m; });
}

function selectMovie(id) {
  selectedMovie = window._movieCache[id];
  if (!selectedMovie) return;

  const m = selectedMovie;
  const poster = m.poster_path
    ? `<img class="modal-poster" src="${tmdb.posterUrl(m.poster_path, 'w500')}" alt="" />`
    : `<div class="modal-poster" style="display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--panel-bg)">🎬</div>`;
  
  const year = m.release_date ? m.release_date.slice(0, 4) : '—';
  const rating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';

  document.getElementById('confirm-content').innerHTML = `
    ${poster}
    <div class="modal-details">
      <span class="tag-preview">Previsualización</span>
      <h3 class="modal-title">${m.title}</h3>
      <p class="modal-meta">${year}${rating ? ' • ' + rating : ''}</p>
      <p class="modal-desc">${m.overview ? m.overview : 'Sin descripción disponible.'}</p>
    </div>`;

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
      fb.textContent = 'Alguien ya recomendó esta película justo ahora. Elige otra.';
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

    document.getElementById('success-msg').textContent =
      `"${selectedMovie.title}" ya está en la lista de tu amigo. ¡Excelente gusto!`;
    show('screen-success');

  } catch (e) {
    fb.textContent = 'Hubo un error al guardar. Inténtalo de nuevo.';
    btn.disabled = false;
  }
}

function recomendar() {
  selectedMovie = null;
  document.getElementById('search-input').value = '';
  document.getElementById('results-container').innerHTML = '';
  document.getElementById('confirm-panel').classList.add('hidden');
  show('screen-search');
  document.getElementById('search-input').focus();
}

// Enter key
document.getElementById('input-code')?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });
document.getElementById('input-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });