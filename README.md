# 🎬 Recomiéndame una peli

Web app para que tus amigos te recomienden películas con búsqueda en tiempo real vía TMDB.

---

## Stack

- **Frontend:** HTML + CSS + JS vanilla (sin frameworks)
- **Base de datos:** Supabase (gratis)
- **API de películas:** TMDB (gratis)
- **Deploy:** Vercel (gratis)

---

## Paso 1 — Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto.
3. Ve a **SQL Editor** y ejecuta esta query para crear la tabla:

```sql
create table recommendations (
  id bigint generated always as identity primary key,
  tmdb_id integer not null unique,
  title text not null,
  poster_path text,
  release_date text,
  vote_average numeric(3,1),
  overview text,
  recommended_by text not null,
  created_at timestamptz default now()
);

-- Permitir lecturas y escrituras públicas (tus amigos no tienen login)
alter table recommendations enable row level security;

create policy "Lectura pública" on recommendations
  for select using (true);

create policy "Inserción pública" on recommendations
  for insert with check (true);
```

4. Ve a **Settings → API** y copia:
   - `Project URL` → es tu `SUPABASE_URL`
   - `anon public key` → es tu `SUPABASE_ANON_KEY`

---

## Paso 2 — TMDB

1. Ve a [themoviedb.org](https://www.themoviedb.org) y crea una cuenta.
2. Ve a **Settings → API** y solicita una API key (gratis, aprobación inmediata).
3. Copia la **API Key (v3 auth)**.

---

## Paso 3 — Configurar el proyecto

Abre `config.js` y rellena los valores:

```js
const CONFIG = {
  ACCESS_CODE: 'cine2025',        // Código para tus amigos
  OWNER_CODE: 'milistaprivada',   // Tu código privado para ver el panel
  TMDB_API_KEY: 'abc123...',      // Tu key de TMDB
  SUPABASE_URL: 'https://xxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
  TMDB_LANGUAGE: 'es-ES',
};
```

---

## Paso 4 — Deploy en Vercel

1. Sube el proyecto a un repositorio en [GitHub](https://github.com).
2. Ve a [vercel.com](https://vercel.com), conecta tu cuenta de GitHub.
3. Importa el repositorio → **Deploy** (sin configuración extra).
4. Vercel te dará una URL pública como `https://tu-proyecto.vercel.app`.

---

## Uso

| URL | Para quién |
|-----|-----------|
| `https://tu-proyecto.vercel.app` | Tus amigos (recomendar) |
| `https://tu-proyecto.vercel.app/panel.html` | Tú (ver la lista) |

- Pásales el link de `index.html` a tus amigos con el `ACCESS_CODE`.
- Entra tú a `panel.html` con tu `OWNER_CODE`.

---

## Estructura de archivos

```
recomiendame/
├── index.html     # Pantalla de tus amigos
├── panel.html     # Tu panel de propietario
├── style.css      # Estilos compartidos
├── config.js      # ← Edita esto con tus keys
├── supabase.js    # Cliente de Supabase (fetch directo)
├── tmdb.js        # Cliente de TMDB
├── app.js         # Lógica de index.html
└── panel.js       # Lógica de panel.html
```
