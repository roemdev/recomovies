// ── Panel de administrador ─────────────────────────
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
    errEl.textContent = 'Clave incorrecta.';
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
    grid.innerHTML = `<div class="empty-state" style="color:var(--error-color);">Error de conexión con Supabase.</div>`;
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

  document.getElementById('rec-count').textContent = total === 1 ? '1 película en la base de datos.' : `${total} películas en la base de datos.`;

  const labelMap = { all: 'Todas las sugeridas ›', downloaded: 'Descargadas ›', liked: 'Te gustaron ›', disliked: 'No te gustaron ›', pending: 'Pendientes por ver ›' };
  document.getElementById('section-label').textContent = labelMap[currentFilter] || '';

  const grid = document.getElementById('panel-grid');

  if (!recs.length) {
    grid.innerHTML = allRecs.length
      ? '<div class="empty-state">No hay películas en esta categoría.</div>'
      : '<div class="empty-state">Nadie ha sugerido películas todavía.</div>';
    return;
  }

  grid.innerHTML = recs.map(m => {
    const poster = m.poster_path
      ? `<img src="https://image.tmdb.org/t/p/w342${m.poster_path}" alt="" loading="lazy" style="width:100%; height:100%; object-fit:cover;" />`
      : `<div class="jf-poster-ph">🎬</div>`;
    
    const year = m.release_date ? m.release_date.slice(0, 4) : '—';
    const date = new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    const dlClass   = m.downloaded   ? ' active-dl'   : '';
    const likeClass = m.liked === true  ? ' active-like' : '';
    const badClass  = m.liked === false ? ' active-bad'  : '';

    return `
    <div class="jf-card" id="card-${m.id}" style="cursor:default;">
      <div class="jf-poster-wrap">
        ${poster}
      </div>
      <div class="jf-card-info" style="text-align:left;">
        <div class="jf-card-title">${m.title}</div>
        <div class="jf-card-meta">${year}</div>
        <div class="rec-footer">Por <strong>${m.recommended_by}</strong> (${date})</div>
        
        <div class="rec-actions">
          <button class="action-btn${dlClass}" id="dl-${m.id}" onclick="toggleDownload(${m.id})" title="Descargada">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="action-btn${likeClass}" id="like-${m.id}" onclick="toggleLike(${m.id}, true)" title="Me gustó">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <button class="action-btn${badClass}" id="bad-${m.id}" onclick="toggleLike(${m.id}, false)" title="No me gustó">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </button>
        </div>
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

  dlBtn.className   = 'action-btn' + (rec.downloaded   ? ' active-dl'   : '');
  likeBtn.className = 'action-btn' + (rec.liked === true  ? ' active-like' : '');
  badBtn.className  = 'action-btn' + (rec.liked === false ? ' active-bad'  : '');
}

document.getElementById('owner-code-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') ownerLogin();
});