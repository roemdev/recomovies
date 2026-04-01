// ── Estado ──────────────────────────────────────
let currentUser = '';
let selectedMovie = null;
let alreadyRecommendedIds = new Set();

// ── Pantallas ────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Login ────────────────────────────────────────
async function enterApp() {
  const name = document.getElementById('input-name').value.trim();
  const code = document.getElementById('input-code').value.trim();
  const errEl = document.getElementById('code-error');

  if (!name) { errEl.textContent = 'Escribe tu nombre.'; return; }
  if (code !== CONFIG.ACCESS_CODE) { errEl.textContent = 'Código incorrecto.'; return; }

  errEl.textContent = '';
  currentUser = name;

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

function logoutToLogin() {
  currentUser = '';
  selectedMovie = null;
  document.getElementById('input-name').value = '';
  document.getElementById('input-code').value = '';
  document.getElementById('code-error').textContent = '';
  show('screen-code');
}

// ── Búsqueda ─────────────────────────────────────
let searchTimer = null;

function handleSearch(val) {
  clearTimeout(searchTimer);
  cancelConfirm();
  const sp = document.getElementById('spinner');
  if (!val.trim()) {
    document.getElementById('results-container').innerHTML = '';
    document.getElementById('results-label').style.display = 'none';
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
      `<p style="font-family:var(--font-m);font-size:.75rem;color:var(--accent2);">Error con TMDB. Verifica la API key en config.js.</p>`;
  }
}

window._movieCache = {};

function renderResults(movies) {
  const container = document.getElementById('results-container');
  const label = document.getElementById('results-label');

  if (!movies.length) {
    label.style.display = 'none';
    container.innerHTML = '<p style="font-family:var(--font-m);font-size:.75rem;color:var(--dim);">Sin resultados.</p>';
    return;
  }

  label.style.display = 'block';
  movies.forEach(m => { window._movieCache[m.id] = m; });

  container.innerHTML = movies.map(m => {
    const already = alreadyRecommendedIds.has(m.id);
    const poster = m.poster_path
      ? `<img class="result-poster" src="${tmdb.posterUrl(m.poster_path)}" alt="" loading="lazy" />`
      : `<div class="result-poster-ph">🎬</div>`;
    const year = m.release_date ? m.release_date.slice(0, 4) : '—';
    const rating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';
    const alreadyBadge = already ? `<span class="already-tag">Ya recomendada</span>` : '';

    return `<div class="result-item${already ? ' already' : ''}" onclick="${already ? '' : `selectMovie(${m.id})`}" data-id="${m.id}">
      ${poster}
      <div class="result-body">
        <div class="result-title">${m.title}${alreadyBadge}</div>
        <div class="result-meta">${year}${rating ? ' · ' + rating : ''}</div>
        ${m.overview ? `<div class="result-overview">${m.overview}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function selectMovie(id) {
  selectedMovie = window._movieCache[id];
  if (!selectedMovie) return;

  document.querySelectorAll('.result-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.id) === id);
  });

  const m = selectedMovie;
  const posterUrl = m.poster_path ? tmdb.posterUrl(m.poster_path, 'w342') : null;

  // Banner con blur
  const blurEl = document.getElementById('confirm-blur');
  if (posterUrl) {
    blurEl.style.backgroundImage = `url(${posterUrl})`;
  } else {
    blurEl.style.backgroundImage = 'none';
  }

  // Poster frontal
  const frontPoster = document.getElementById('confirm-front-poster');
  frontPoster.innerHTML = posterUrl
    ? `<img class="confirm-front-poster" src="${posterUrl}" alt="" />`
    : `<div class="confirm-front-poster-ph">🎬</div>`;

  document.getElementById('confirm-front-title').textContent = m.title;
  const year = m.release_date ? m.release_date.slice(0, 4) : '—';
  const rating = m.vote_average ? m.vote_average.toFixed(1) + ' ★' : '';
  document.getElementById('confirm-front-meta').textContent = `${year}${rating ? ' · ' + rating : ''}`;

  document.getElementById('confirm-overview').textContent =
    m.overview ? m.overview.slice(0, 180) + (m.overview.length > 180 ? '…' : '') : 'Sin sinopsis disponible.';

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

  try {
    const alreadyExists = await db.exists(selectedMovie.id);
    if (alreadyExists) {
      fb.textContent = 'Alguien ya la recomendó mientras buscabas. Elige otra.';
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
      `"${selectedMovie.title}" ya está en la lista de tu amigo. ¡Gracias, ${currentUser}!`;
    show('screen-success');

  } catch (e) {
    fb.textContent = 'Error al guardar. Inténtalo de nuevo.';
    fb.className = 'confirm-feedback error';
    btn.disabled = false;
  }
}

function recomendar() {
  selectedMovie = null;
  document.getElementById('search-input').value = '';
  document.getElementById('results-container').innerHTML = '';
  document.getElementById('results-label').style.display = 'none';
  document.getElementById('confirm-panel').classList.add('hidden');
  show('screen-search');
  document.getElementById('search-input').focus();
}

// Enter key
['input-code', 'input-name'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') enterApp(); });
});