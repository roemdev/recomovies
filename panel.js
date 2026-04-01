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

    // Determina el estilo del botón Descargado (azul si es verdadero)
    const dlClass = m.downloaded ? ' active-dl' : '';
    // Determina los reflejos del póster en caso de gustar
    const reflectionClass = m.liked === true ? ' reflection-liked' : (m.liked === false ? ' reflection-disliked' : '');
    
    // Iconos de estado para los botones del hover
    const likeActive = m.liked === true ? ' active-like' : '';
    const badActive = m.liked === false ? ' active-bad' : '';

    return `
    <div class="jf-card" id="card-${m.id}" style="cursor:default;">
      
      <!-- Portada con Hover para Me Gustó / No Me Gustó -->
      <div class="jf-poster-wrap${reflectionClass}">
        ${poster}
        
        <div class="panel-poster-hover">
           <button class="hover-action-btn${likeActive}" onclick="toggleLike(${m.id}, true)" title="Me gustó">👍</button>
           <button class="hover-action-btn${badActive}" onclick="toggleLike(${m.id}, false)" title="No me gustó">👎</button>
        </div>
      </div>
      
      <!-- Info y Botón Único -->
      <div class="jf-card-info" style="text-align:center;">
        <div class="jf-card-title">${m.title}</div>
        <div class="jf-card-meta">${year}</div>
        <div class="rec-footer">De: <strong>${m.recommended_by}</strong></div>
        
        <button class="btn-download${dlClass}" id="dl-${m.id}" onclick="toggleDownload(${m.id})">
          ${m.downloaded ? 'Descargada' : 'Marcar Descargada'}
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
  
  const dlBtn = document.getElementById(`dl-${id}`);
  if(dlBtn) {
    dlBtn.className = 'btn-download' + (newVal ? ' active-dl' : '');
    dlBtn.textContent = newVal ? 'Descargada' : 'Marcar Descargada';
  }
  
  await db.updateStatus(id, { downloaded: newVal });
}

async function toggleLike(id, val) {
  const rec = allRecs.find(r => r.id === id);
  if (!rec) return;
  const newVal = rec.liked === val ? null : val;
  rec.liked = newVal;
  
  // Al cambiar el like, re-renderizamos visualmente el panel
  // ya que los colores del hover y el reflejo se generan en renderPanel()
  renderPanel();
  
  await db.updateStatus(id, { liked: newVal });
}

document.getElementById('owner-code-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') ownerLogin();
});