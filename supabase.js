// Cliente minimalista de Supabase (sin SDK, usando fetch directo)

const db = {
  async getAll() {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/recommendations?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        }
      }
    );
    if (!res.ok) throw new Error('Error cargando recomendaciones');
    return res.json();
  },

  async exists(tmdb_id) {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/recommendations?tmdb_id=eq.${tmdb_id}&select=id`,
      {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        }
      }
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
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(row),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error guardando recomendación');
    }
    return res.json();
  }
};
