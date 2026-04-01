// ── Temas para el Panel ──────────────────────────
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

initTheme();

// ── Panel de propietario ─────────────────────────
let allRecs = [];
let currentFilter = 'all';

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function ownerLogin() {
  const code = document.getElementById('owner-code-input').value.trim();
  const errEl = document.getElementById('owner-error');

  if (code !== CONFIG.OWNER_CODE) {
    errEl.textContent = 'Código de propietario incorrecto.';
    return;
  }
  errEl.textContent = '';
  show('screen-panel-main');
  await loadPanel();
}

function ownerLogout() {
  document.getElementById('owner-code-input').value = '';
  document.getElementById('panel-grid').innerHTML = '<div class="empty-state">Conectando al servidor...</div>';
  show('screen-panel-login');
}

async function loadPanel() {
  const grid = document.getElementById('panel-grid');
  grid.innerHTML = '<div class="empty-state">Sincronizando base de datos...</div>';

  try {
    allRecs = await db.getAll();
    renderPanel();
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="color:var(--error-color);">Error cargando datos. Verifica tu config de Supabase.</div>`;
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

  document.getElementById('rec-count').textContent = total === 1 ? '1 película' : `${total} películas`;

  const labelMap = { all: `${total} recomendaciones totales`, downloaded: 'Descargadas', liked: 'Me gustó', disliked: 'No me gustó', pending: 'Sin ver aún' };
  document.getElementById('section-label').textContent = labelMap[currentFilter] || '';

  const grid = document.getElementById('panel-grid');

  if (!recs.length) {
    grid.innerHTML = allRecs.length
      ? '<div class="empty-state">Sin películas en esta categoría.</div>'
      : '<div class="empty-state">Todavía no hay recomendaciones.</div>';
    return;
  }

  grid.innerHTML = recs.map(m => {
    const poster = m.poster_path
      ? `<img src="https://image.tmdb.org/t/p/w342${m.poster_path}" alt="" loading="lazy" />`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--panel-bg)">🎬</div>`;
    
    const year = m.release_date ? m.release_date.slice(0, 4) : '—';
    const date = new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    const dlClass   = m.downloaded   ? ' s-dl'   : '';
    const likeClass = m.liked === true  ? ' s-like' : '';
    const badClass  = m.liked === false ? ' s-bad'  : '';

    return `
    <div class="movie-card" id="card-${m.id}">
      <div class="card-poster-wrap">
        ${poster}
      </div>
      <div class="card-info" style="padding: 1rem 1rem 0;">
        <h3 class="card-title">${m.title}</h3>
        <p class="card-meta">${year}</p>
      </div>
      <div class="rec-card-footer">
        Añadida por <strong class="text-accent">${m.recommended_by}</strong> (${date})
      </div>
      <div class="rec-status-bar">
        <button class="status-btn${dlClass}" id="dl-${m.id}" onclick="toggleDownload(${m.id})">
          ${m.downloaded ? '⬇ Descargada' : '⬇ Descargar'}
        </button>
        <button class="status-btn${likeClass}" id="like-${m.id}" onclick="toggleLike(${m.id}, true)">
          ✓ Sí
        </button>
        <button class="status-btn${badClass}" id="bad-${m.id}" onclick="toggleLike(${m.id}, false)">
          ✕ No
        </button>
      </div>
    </div>`;
  }).join('');
}

async function toggleDownload(id) {
  const rec = allRecs.find(r => r.id === id);
  if (!rec) return;
  const newVal = !rec.downloaded;
  rec.downloaded = newVal;
  applyStatusClasses(id, rec);
  await db.updateStatus(id, { downloaded: newVal });
}

async function toggleLike(id, val) {
  const rec = allRecs.find(r => r.id === id);
  if (!rec) return;
  const newVal = rec.liked === val ? null : val;
  rec.liked = newVal;
  applyStatusClasses(id, rec);
  await db.updateStatus(id, { liked: newVal });
}

function applyStatusClasses(id, rec) {
  const dlBtn   = document.getElementById(`dl-${id}`);
  const likeBtn = document.getElementById(`like-${id}`);
  const badBtn  = document.getElementById(`bad-${id}`);
  if (!dlBtn) return;

  dlBtn.className   = 'status-btn' + (rec.downloaded   ? ' s-dl'   : '');
  dlBtn.textContent = rec.downloaded ? '⬇ Descargada' : '⬇ Descargar';
  
  likeBtn.className = 'status-btn' + (rec.liked === true  ? ' s-like' : '');
  badBtn.className  = 'status-btn' + (rec.liked === false ? ' s-bad'  : '');
}

document.getElementById('owner-code-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') ownerLogin();
});