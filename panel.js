// ── Panel de propietario ─────────────────────────

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
  document.getElementById('panel-grid').innerHTML = '<div class="empty-state">Cargando...</div>';
  show('screen-panel-login');
}

async function loadPanel() {
  const grid = document.getElementById('panel-grid');
  grid.innerHTML = '<div class="empty-state">Cargando...</div>';

  try {
    const recs = await db.getAll();
    document.getElementById('rec-count').textContent =
      recs.length === 1 ? '1 película' : `${recs.length} películas`;

    if (!recs.length) {
      grid.innerHTML = '<div class="empty-state">Todavía no hay recomendaciones.<br/>Pásale el link a tus amigos.</div>';
      return;
    }

    grid.innerHTML = recs.map(m => {
      const poster = m.poster_path
        ? `<img class="rec-card-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" alt="" loading="lazy" />`
        : `<div class="rec-card-poster-ph">🎬</div>`;
      const year = m.release_date ? m.release_date.slice(0, 4) : '—';
      const rating = m.vote_average ? parseFloat(m.vote_average).toFixed(1) + ' ★' : '';
      const date = new Date(m.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

      return `<div class="rec-card">
        ${poster}
        <div class="rec-card-body">
          <div class="rec-card-title">${m.title}</div>
          <div class="rec-card-meta">${year}${rating ? ' · ' + rating : ''}</div>
          <div class="rec-card-who">Recomendada por <strong>${m.recommended_by}</strong><br/>${date}</div>
        </div>
      </div>`;
    }).join('');

  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="color:#e85a4f;">Error cargando datos. Verifica tu config de Supabase.</div>`;
  }
}

document.getElementById('owner-code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') ownerLogin();
});
