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

  // Precarga IDs ya recomendados para chequear en tiempo real
  try {
    const recs = await db.getAll();
    alreadyRecommendedIds = new Set(recs.map(r => r.tmdb_id));
  } catch (e) {
    alreadyRecommendedIds = new Set();
  }

  document.getElementById('top-user-name').textContent = name;
  show('screen-search');
  document.getElementById('search-input').focus();
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
      `<p style="color:#e85a4f;font-size:.85rem;">Error conectando con TMDB. Verifica tu API key en config.js.</p>`;
  }
}

function renderResults(movies) {
  const container = document.getElementById('results-container');
  if (!movies.length) {
    container.innerHTML = '<p style="color:rgba(240,237,230,0.35);font-size:.85rem;">Sin resultados para esa búsqueda.</p>';
    return;
  }

  container.innerHTML = movies.map(m => {
    const already = alreadyRecommendedIds.has(m.id);
    const poster = m.poster_path
      ? `<img class="result-poster" src="${tmdb.posterUrl(m.poster_path)}" alt="" loading="lazy" />`
      : `<div class="result-poster-ph">🎬</div>`;
    const year = m.release_date ? m.release_date.slice(0, 4) : '—';
    const rating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';
    const alreadyBadge = already ? `<span class="already-badge">Ya recomendada</span>` : '';
    const overview = m.overview ? `<div class="result-overview">${m.overview}</div>` : '';
    const alreadyClass = already ? ' already' : '';

    return `<div class="result-item${alreadyClass}" onclick="${already ? '' : `selectMovie(${m.id})`}" data-id="${m.id}">
      ${poster}
      <div class="result-body">
        <div class="result-title">${m.title}${alreadyBadge}</div>
        <div class="result-meta">${year}${rating ? ' · ' + rating : ''}</div>
        ${overview}
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

  document.querySelectorAll('.result-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.id) === id);
  });

  const m = selectedMovie;
  const poster = m.poster_path
    ? `<img class="confirm-poster" src="${tmdb.posterUrl(m.poster_path, 'w154')}" alt="" />`
    : `<div class="confirm-poster-ph">🎬</div>`;
  const year = m.release_date ? m.release_date.slice(0, 4) : '—';
  const rating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';

  document.getElementById('confirm-content').innerHTML = `
    <div class="confirm-movie-row">
      ${poster}
      <div>
        <div class="confirm-title">${m.title}</div>
        <div class="confirm-meta">${year}${rating ? ' · ' + rating : ''}</div>
        <div class="confirm-overview">${m.overview ? m.overview.slice(0, 140) + '…' : ''}</div>
      </div>
    </div>`;

  const fb = document.getElementById('confirm-feedback');
  fb.textContent = '';
  fb.className = 'confirm-feedback';
  document.getElementById('confirm-btn').disabled = false;
  document.getElementById('confirm-panel').classList.remove('hidden');
  document.getElementById('confirm-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelConfirm() {
  selectedMovie = null;
  document.getElementById('confirm-panel').classList.add('hidden');
  document.querySelectorAll('.result-item').forEach(el => el.classList.remove('selected'));
}

async function submitRecommendation() {
  if (!selectedMovie) return;

  const fb = document.getElementById('confirm-feedback');
  const btn = document.getElementById('confirm-btn');
  btn.disabled = true;

  // Doble-check en tiempo real por si otra persona recomendó mientras buscaba
  try {
    const alreadyExists = await db.exists(selectedMovie.id);
    if (alreadyExists) {
      fb.textContent = 'Alguien ya recomendó esta película justo ahora. Elige otra.';
      fb.className = 'confirm-feedback error';
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
      `"${selectedMovie.title}" ya está en la lista. ¡Gracias, ${currentUser}!`;
    show('screen-success');

  } catch (e) {
    fb.textContent = 'Hubo un error al guardar. Inténtalo de nuevo.';
    fb.className = 'confirm-feedback error';
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

// Enter key en los inputs de login
document.getElementById('input-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') enterApp();
});
document.getElementById('input-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') enterApp();
});
