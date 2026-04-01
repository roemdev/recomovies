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
    case 'pending':    return allRecs.filter(r => !r.downloaded);
    default:           return allRecs;
  }
}

function renderPanel() {
  const recs = filtered();
  const total = allRecs.length;

  document.getElementById('rec-count').textContent = total === 1 ? '1 película en la base de datos.' : `${total} películas en la base de datos.`;

  const labelMap = { all: 'Todas las sugeridas ›', downloaded: 'Descargadas ›', pending: 'Pendientes por ver ›' };
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

    const dlClass = m.downloaded ? ' active-dl' : '';

    return `
    <div class="jf-card" id="card-${m.id}" style="cursor:default;">
      
      <div class="jf-poster-wrap">
        ${poster}
      </div>
      
      <div class="jf-card-info" style="text-align:left;">
        <div class="jf-card-title">${m.title}</div>
        <div class="jf-card-meta">${year}</div>
        <div class="rec-footer" style="text-align:left;">De: <strong>${m.recommended_by}</strong></div>
        
        <div style="display:flex; gap:8px;">
          <button class="btn-download${dlClass}" id="dl-${m.id}" onclick="toggleDownload(${m.id})">
            ${m.downloaded ? 'Descargada' : 'Marcar Descargada'}
          </button>
          <button class="btn-delete" onclick="deleteRec(${m.id})" title="Eliminar sugerencia">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
  
  const dlBtn = document.getElementById(`dl-${id}`);
  if(dlBtn) {
    dlBtn.className = 'btn-download' + (newVal ? ' active-dl' : '');
    dlBtn.textContent = newVal ? 'Descargada' : 'Marcar Descargada';
  }
  
  await db.updateStatus(id, { downloaded: newVal });
}

async function deleteRec(id) {
  if (!confirm("¿Seguro que quieres eliminar esta sugerencia?")) return;
  
  const card = document.getElementById(`card-${id}`);
  if (card) card.style.opacity = '0.4';
  
  try {
    await db.delete(id);
    allRecs = allRecs.filter(r => r.id !== id);
    renderPanel();
  } catch (e) {
    alert("Hubo un error al eliminar la película.");
    if (card) card.style.opacity = '1';
  }
}

document.getElementById('owner-code-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') ownerLogin();
});