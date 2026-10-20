# FitWork — App de retos físicos para estudiantes

**FitWork** es una web estática (HTML + JS + Tailwind) que gamifica la actividad física escolar: los estudiantes completan retos, suben evidencia en video opcional, y los profesores (administradores) aprueban/rechazan para otorgar puntos. Desplegada en **Vercel** con backend en **Supabase**.

---

## 🚀 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, Vanilla JS (ESM), Tailwind CSS (build local), SweetAlert2 |
| Auth & DB | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Vercel (static) |
| Estilos | Tema oscuro institucional: verde `#2e9e5b`, dorado `#d4af37` |

---

## 📁 Estructura del proyecto

```
fitwork/
├── index.html          # Landing pública
├── login.html          # Inicio de sesión
├── registro.html       # Registro (acepta emails institucionales)
├── desafios.html       # Catálogo de retos + cronómetro + subida video
├── aprobaciones.html   # Panel admin: ver/gestionar solicitudes + video firmado
├── ranking.html        # Tabla de posiciones
├── panel.html          # Perfil del estudiante
├── usuarios.html       # Gestión de usuarios (admin)
├── estadisticas.html   # Métricas globales (admin)
├── nav.js / nav.css    # Barra inferior compartida
├── dist/styles.css     # Tailwind compilado
├── tailwind.config.js
├── package.json
├── vercel.json
└── server.js           # Dev server local (opcional)
```

---

## ⚙️ Instalación local

```bash
# 1. Dependencias (solo para compilar Tailwind)
npm install

# 2. Compilar CSS una vez
npm run build:css

# 3. Modo watch (recompila al guardar)
npm run watch:css

# 4. Servidor local (opcional)
node server.js   # → http://localhost:3000
```

> **Nota**: Los HTML funcionan abriéndolos directo en el navegador si ya existe `dist/styles.css`. El server solo evita problemas de CORS con módulos ES.

---

## 🗄️ Base de datos (Supabase)

### Tablas principales

| Tabla | Clave | Descripción |
|-------|-------|-------------|
| `usuario` | `id` (uuid) | Perfil extendido: `auth_id`, `nombre`, `email`, `puntos`, `retos_completados[]`, `progreso`, `rol_id`, `estado_id` |
| `rol` | `id` | `nombre`: `"Estudiante"`, `"Administrador"`, etc. |
| `estado` | `id` | `nombre`: `"Activo"`, `"Inactivo"`, etc. |
| `solicitud_reto` | `id` | `auth_id`, `challenge_id`, `titulo`, `puntos`, `tiempo_segundos`, `estado` (`pendiente/aprobado/rechazado`), `video_url` (text, path o URL legacy), `creado_at`, `resuelto_por`, `resuelto_at` |

### Storage

- Bucket: **`evidencias-retos`** (privado)
- Estructura de paths: `<auth.uid()>/<challenge_id>-<timestamp>.<ext>`
- **Políticas** (configurar en Dashboard → Storage → Policies):
  - **INSERT**: `authenticated` · `(storage.foldername(name))[1] = auth.uid()::text`
  - **SELECT**: `authenticated` · `(storage.foldername(name))[1] = auth.uid()::text` *(ver nota abajo)*

> ⚠️ **Seguridad del video**: Sin SQL personalizado, la policy SELECT permite al propietario ver su video. Para restringir **solo a administradores** se requiere una función `es_admin()` SECURITY DEFINER + policy `USING public.es_admin()` (ejecutar en SQL Editor). Ver sección "Pendiente de SQL" abajo.

---

## 🔐 Flujo de video (evidencia privada)

1. **Estudiante** termina reto → modal SweetAlert `input: file` → sube a `evidencias-retos` en su carpeta.
2. `desafios.html` guarda **solo el path** (`video_url = "uuid/archivo.mp4"`) en `solicitud_reto`.
3. **Admin** abre `aprobaciones.html` → ve botón "▶ Ver video".
4. Click → `aprobaciones.html` llama `createSignedUrl(path, 300)` → URL válida 5 min → reproduce en `<video>` modal.
5. **Compatibilidad**: si `video_url` ya es `http...` (datos antiguos), se usa directo sin firmar.

---

## 👥 Roles y acceso

| Página | Quién accede | Validación |
|--------|--------------|------------|
| `desafios.html`, `ranking.html`, `panel.html` | Estudiante logueado | `ensureSession()` en JS |
| `aprobaciones.html`, `usuarios.html`, `estadisticas.html` | Solo `rol = "Administrador"` | Check en cliente (`profile.rol.nombre`) + RLS en BD |

> La validación en cliente es UX; la seguridad real está en **RLS** (políticas en `solicitud_reto` y `usuario`).

---

## 🌐 Despliegue en Vercel

1. Conecta repo `hiperbrayan14/fitwork` en Vercel.
2. Framework: **Other** (static).
3. Build command: `npm run build:css` (opcional, si quieres compilar en CI).
4. Output directory: `/` (raíz).
5. Variables de entorno: **ninguna** (clave pública de Supabase ya en el código).

`vercel.json` incluido para SPA fallback a `index.html`.

---

## ✅ Checklist de configuración en Supabase Dashboard (solo clics)

1. **Storage → evidencias-retos → Settings** → **Public bucket: OFF** (privado).
2. **Storage → Policies → New Policy** (x2):
   - **INSERT**: Template "Insert objects" → `authenticated` → USING `(storage.foldername(name))[1] = auth.uid()::text`
   - **SELECT**: Template "Select objects" → `authenticated` → USING `(storage.foldername(name))[1] = auth.uid()::text`
3. **Table Editor → solicitud_reto** → Add column `video_url` (text, nullable) si no existe.
4. **Authentication → Providers** → Email habilitado (Confirm email: ON recomendado).
5. **RLS** activado en `usuario` y `solicitud_reto` (políticas incluidas en SQL opcional abajo).

---

## 🧪 Prueba rápida end-to-end

| Paso | Usuario | Acción | Resultado esperado |
|------|---------|--------|---------------------|
| 1 | Estudiante | `desafios.html` → Iniciar → Finalizar → subir `.mp4` → Enviar | Toast "¡Reto enviado!", botón "⏳ Esperando..." |
| 2 | Admin | `aprobaciones.html` → Pendientes → "▶ Ver video" | Modal con video playing (1-2 seg) |
| 3 | Cualquiera | Copiar URL del video → abrir en incógnito | **Error 403 / no reproduce** (bucket privado) |

---

## 📝 Pendiente de SQL (seguridad completa del video)

Si quieres que **solo administradores** puedan leer videos (ni el propietario), ejecuta **una vez** en **SQL Editor**:

```sql
-- Función definer para evitar recursión RLS
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.usuario u
    JOIN public.rol r ON u.rol_id = r.id
    WHERE u.auth_id = auth.uid() AND r.nombre = 'Administrador'
  ) INTO v;
  RETURN v;
END $$;

GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated, service_role;

-- Policy SELECT solo admin (reemplaza la de propietario)
DROP POLICY IF EXISTS "admin_o_propietario_ven_videos" ON storage.objects;
CREATE POLICY "admin_ve_todos_videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evidencias-retos' AND public.es_admin());

-- RLS en solicitud_reto (si no existen)
ALTER TABLE public.solicitud_reto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_lean_sus_solicitudes" ON public.solicitud_reto FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "usuarios_insertan_sus_solicitudes" ON public.solicitud_reto FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "admin_lee_todas_solicitudes" ON public.solicitud_reto FOR SELECT USING (public.es_admin());
CREATE POLICY "admin_actualiza_todas_solicitudes" ON public.solicitud_reto FOR UPDATE USING (public.es_admin()) WITH CHECK (public.es_admin());
```

---

## 🎨 Personalización de colores

Edita `--accent` y variables en cada HTML o en `tailwind.config.js`:

```css
:root {
  --accent: #2e9e5b;      /* Verde institucional */
  --accent-hover: #247a46;
  --gold: #d4af37;        /* Dorado para badges pendientes */
}
```

---

## 📄 Licencia

Uso educativo interno. Sin garantía.