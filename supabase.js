// Supabase client — fetch directo, sin SDK

const db = {
  headers() {
    return {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  },

  async getAll() {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/recommendations?select=*&order=created_at.desc`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error('Error cargando recomendaciones');
    return res.json();
  },

  async exists(tmdb_id) {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/recommendations?tmdb_id=eq.${tmdb_id}&select=id`,
      { headers: this.headers() }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.length > 0;
  },

  async insert(row) {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/recommendations`,
      {
        method: 'POST',
        headers: { ...this.headers(), 'Prefer': 'return=representation' },
        body: JSON.stringify(row),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error guardando recomendación');
    }
    return res.json();
  },

  // Actualiza campos de estado (downloaded, liked)
  async updateStatus(id, patch) {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/recommendations?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: { ...this.headers(), 'Prefer': 'return=minimal' },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error actualizando estado');
    }
    return true;
  }
};