// ── Panel de propietario ─────────────────────────

let allRecs = [];
let currentFilter = 'all';
// Estado local de botones (se persiste en Supabase)
// formato: { [id]: { downloaded: bool, liked: null|true|false } }

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function ownerLogin() {
  const code = document.getElementById('owner-code-input').value.trim();
  const errEl = document.getElementById('owner-error');
  if (code !== CONFIG.OWNER_CODE) { errEl.textContent = 'Código incorrecto.'; return; }
  errEl.textContent = '';
  show('screen-panel-main');
  await loadPanel();
}

function ownerLogout() {
  document.getElementById('owner-code-input').value = '';
  show('screen-panel-login');
}

async function loadPanel() {
  const grid = document.getElementById('panel-grid');
  grid.innerHTML = '<div class="empty-state">Cargando…</div>';

  try {
    allRecs = await db.getAll();
    renderPanel();
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="color:var(--accent2);">Error cargando datos. Verifica tu config.</div>`;
  }
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPanel();
}

function filtered() {
  switch (currentFilter) {
    case 'downloaded': return allRecs.filter(r => r.downloaded);
    case 'liked':      return allRecs.filter(r => r.liked === true);
    case 'disliked':   return allRecs.filter(r => r.liked === false);
    case 'pending':    return allRecs.filter(r => !r.downloaded && r.liked === null);
    default:           return allRecs;
  }
}

function renderPanel() {
  const recs = filtered();
  const total = allRecs.length;

  document.getElementById('rec-count').textContent =
    total === 1 ? '1 película' : `${total} películas`;

  const label = document.getElementById('section-label');
  const labelMap = { all: `${total} recomendaciones`, downloaded: 'Descargadas', liked: 'Me gustó', disliked: 'No me gustó', pending: 'Sin ver aún' };
  label.textContent = labelMap[currentFilter] || '';

  const grid = document.getElementById('panel-grid');

  if (!recs.length) {
    grid.innerHTML = allRecs.length
      ? '<div class="empty-state">Sin películas en esta categoría.</div>'
      : '<div class="empty-state">Todavía no hay recomendaciones.<br/>Pásale el link a tus amigos.</div>';
    return;
  }

  grid.innerHTML = recs.map(m => movieCard(m)).join('');
}

function movieCard(m) {
  const poster = m.poster_path
    ? `<img class="movie-card-poster" src="https://image.tmdb.org/t/p/w154${m.poster_path}" alt="" loading="lazy" />`
    : `<div class="movie-card-poster-ph">🎬</div>`;

  const year   = m.release_date ? m.release_date.slice(0, 4) : '—';
  const rating = m.vote_average  ? parseFloat(m.vote_average).toFixed(1) + ' ★' : '';
  const date   = new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  // Status classes
  const dlClass   = m.downloaded   ? ' s-dl'   : '';
  const likeClass = m.liked === true  ? ' s-like' : '';
  const badClass  = m.liked === false ? ' s-bad'  : '';

  const overview = m.overview
    ? `<div class="movie-card-overview">${m.overview}</div>`
    : '';

  return `<div class="movie-card" id="card-${m.id}">
    <div class="save-dot" id="dot-${m.id}"></div>
    <div class="movie-card-top">
      <div class="movie-card-poster-col">${poster}</div>
      <div class="movie-card-info">
        <div class="movie-card-year">${year}</div>
        <div class="movie-card-title">${m.title}</div>
        ${rating ? `<div class="movie-card-rating">${rating}</div>` : ''}
        <div class="movie-card-who">Por <strong>${m.recommended_by}</strong> · ${date}</div>
      </div>
    </div>
    ${overview}
    <div class="movie-card-status">
      <button class="status-btn${dlClass}" id="dl-${m.id}" onclick="toggleDownload(${m.id})">
        <span class="status-icon">↓</span>
        <span>${m.downloaded ? 'Descargada' : 'Descargar'}</span>
      </button>
      <button class="status-btn${likeClass}" id="like-${m.id}" onclick="toggleLike(${m.id}, true)">
        <span class="status-icon">✓</span>
        <span>${m.liked === true ? 'Me gustó' : 'Me gustó'}</span>
      </button>
      <button class="status-btn${badClass}" id="bad-${m.id}" onclick="toggleLike(${m.id}, false)">
        <span class="status-icon">✕</span>
        <span>${m.liked === false ? 'No me gustó' : 'No me gustó'}</span>
      </button>
    </div>
  </div>`;
}

async function toggleDownload(id) {
  const rec = allRecs.find(r => r.id === id);
  if (!rec) return;
  const newVal = !rec.downloaded;
  rec.downloaded = newVal;
  applyStatusClasses(id, rec);
  await saveStatus(id, { downloaded: newVal });
}

async function toggleLike(id, val) {
  const rec = allRecs.find(r => r.id === id);
  if (!rec) return;
  // Toggle: si ya está activo, lo quita (null); si no, lo pone
  const newVal = rec.liked === val ? null : val;
  rec.liked = newVal;
  applyStatusClasses(id, rec);
  await saveStatus(id, { liked: newVal });
}

function applyStatusClasses(id, rec) {
  const dlBtn   = document.getElementById(`dl-${id}`);
  const likeBtn = document.getElementById(`like-${id}`);
  const badBtn  = document.getElementById(`bad-${id}`);
  if (!dlBtn) return;

  dlBtn.className   = 'status-btn' + (rec.downloaded   ? ' s-dl'   : '');
  likeBtn.className = 'status-btn' + (rec.liked === true  ? ' s-like' : '');
  badBtn.className  = 'status-btn' + (rec.liked === false ? ' s-bad'  : '');
}

async function saveStatus(id, patch) {
  const dot = document.getElementById(`dot-${id}`);
  if (dot) dot.classList.add('on');
  try {
    await db.updateStatus(id, patch);
  } catch (e) {
    console.error('Error guardando estado:', e);
  } finally {
    if (dot) dot.classList.remove('on');
  }
}

document.getElementById('owner-code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') ownerLogin();
});