# DESIGN.md — Clubs UNID

Guía de diseño basada en el **código actual del repositorio**. Sirve de referencia para interfaces nuevas, en especial la landing pública `Clubs UNID Campeche`.

> **Alcance del análisis:** lectura de código fuente, configuración y recursos. **No** se verificó en navegador (sin herramientas de UI en la sesión de elaboración). Donde se afirme un valor, se cita el archivo que lo sostiene.

Cada regla se marca como:

| Marca | Significado |
|-------|-------------|
| **Verificado** | Existe y se usa en el código activo. |
| **Inconsistencia** | Hay más de una implementación para el mismo propósito. |
| **Propuesta** | Recomendación todavía no implementada. |

---

## 1. Identidad visual y alcance

| Elemento | Regla | Origen |
|----------|-------|--------|
| Sistema | **Clubs UNID** — gestión de clubes universitarios | `README.md` |
| Presentación pública | **Clubs UNID Campeche** | `index.html` (`<title>`), `src/config/landing.js` |
| Enfoque visual | Oscuro por defecto («azul noche») con acento **ámbar**; modo claro alternativo | `src/contexts/ThemeContext.jsx` (`modoOscuro` inicia en `true`) |
| Estilos | **Tailwind CSS 4** vía `@import "tailwindcss"`; sin `tailwind.config.*` ni tokens CSS globales | `src/index.css`, `package.json` |
| Fuentes | `font-sans` de Tailwind (pila del sistema). **No** hay `@font-face` ni Google Fonts | `src/App.jsx:132`; grep de `@font-face` sin resultados |
| Iconografía | Mapa propio SVG (Heroicons-style), componente `Icono` | `src/components/ui/Icono.jsx` |
| Marca gráfica | `logo-lobo.svg` (navbar), `lobounid.png` (marca de agua encuesta/landing), `LogoU.png` (Portal), `favicon.svg` | `public/`, `src/components/layout/barra-navegacion/Logotipo.jsx`, `FondoEncuesta.jsx`, `BotonPortal.jsx` |

**Alcance de esta guía:** páginas públicas (`/`, `/club/:id`, `/conoce-clubs`, `/encuesta/:slug`, `/calendario`) y componentes compartidos de `src/components/ui` y `layout`. Los paneles (`/dashboard`, `/presidente`, `/admin`, `/rectoria`) se describen aparte (sección 12).

**Color de marca no centralizado:** no existe un archivo de tokens de color. Los hex y clases Tailwind están repartidos en `ThemeContext` y en JSX. Cualquier alias nuevo (p. ej. `--color-brand`) se considera **Propuesta**.

---

## 2. Paleta de colores y funciones

### 2.1 Superficies del tema (verificado — `ThemeContext.jsx`)

| Función | Oscuro | Claro |
|---------|--------|-------|
| Fondo de página | `bg-[#0b111e]` | `bg-slate-50` |
| Texto base | `text-slate-200` | `text-slate-800` |
| Títulos | `text-white` | `text-slate-900` |
| Subtítulos / texto secundario | `text-slate-400` | `text-slate-500` |
| Navbar (header) | `bg-[#0b111e]/80` | `bg-white` |
| Borde de header | `border-slate-800/60` | `border-slate-200` |
| Superficie de tarjeta (`cardCls`) | `bg-[#0e162c] border-slate-700/50` | `bg-white border-slate-200 shadow-sm` |
| Dropdown / menús | `bg-[#0e162c]` | `bg-white` |
| Input / select | `bg-[#18223f] border-slate-700` | `bg-slate-100 border-slate-300` |
| Pill de navegación (`navPill`) | `bg-[#18223f]/60 border-slate-800` | `bg-slate-100 border-slate-200` |

### 2.2 Azules «de sistema» (verificado — uso repetido en JSX)

| Hex | Rol habitual | Ejemplos |
|-----|--------------|----------|
| `#0b111e` | Fondo app oscuro | `ThemeContext`, `SplashScreen`, overlay hero en `PaginaInicio` |
| `#0e162c` | Superficie elevada / card / modal | `ThemeContext.cardCls`, `ModalBase`, `TarjetaClub`, secciones de club |
| `#18223f` | Superficie intermedia / inputs | `ThemeContext.inputCls`, bloques de presidente, `CampoPregunta` |
| `#0a1128` | Sidebar de panel | `ThemeContext.sbBg`, `NavegacionPanel` |

### 2.3 Acento y estados (verificado)

| Función | Oscuro | Claro | Origen |
|---------|--------|-------|--------|
| Acento primario / acción | **ámbar** `amber-400` / `amber-500` | `#0e162c` o `amber-400` según control | `btnActive`, `BotonAccion.primary` |
| Botón primario relleno | `bg-amber-400 hover:bg-amber-500 text-[#0e162c]` | ídem | `BotonAccion.jsx` |
| Éxito / abierto | `emerald-400` / `emerald-500` | ídem con opacidad | `Badge.jsx`, `TarjetaClub` badge convocatoria |
| Error / peligro | `red-400` / `red-500` | ídem | `Alerta.jsx`, `BotonAccion.danger` |
| Información | `blue-400` | ídem | `Alerta.jsx` |
| Texto atenuado en badges | `*-500/20` fondo + `*-400` texto + borde `*-500/30` | ídem (tonos oscuros del mismo matiz) | `Badge.jsx`, `AvatarInicial.jsx` |

### 2.4 Categorías de club (verificado — `constants/colores.js`)

| Categoría | Oscuro | Claro |
|-----------|--------|-------|
| Deportes | ámbar | ámbar oscuro sobre `amber-100` |
| Cultura | verde | verde sobre `green-100` |
| Tecnología | azul | azul sobre `blue-100` |
| (otra) | fallback Deportes | fallback Deportes |

> **Inconsistencia menor:** el catálogo de la API y el footer usan «Tecnología» con tilde; el seed SQL y algún orden usan variantes sin tilde. `clasesBadge` solo reconoce `Tecnología` con tilde; otro texto cae al fallback Deportes.

### 2.5 Gradientes y efectos especiales (verificado — `index.css`)

| Clase | Uso | Notas |
|-------|-----|-------|
| `.boton-interes-cta` | CTA «Me interesa» en noticias/eventos | Gradiente ámbar; sombra `rgba(2,6,23,.24)`; foco `#fcd34d` |
| `.boton-interes-confirmado` | Estado confirmado del mismo CTA | Verde translúcido; variante `--claro` para tema claro |
| Scrollbars `.scrollbar-amber` / `.scrollbar-dark` | Paneles y modales | Ámbar o slate según contexto |

---

## 3. Tipografía

| Aspecto | Regla | Origen | Marca |
|---------|-------|--------|-------|
| Familia | Tailwind `font-sans` (system-ui / Segoe UI / etc. del SO) | `App.jsx` root; sin `@font-face` | Verificado |
| Títulos de sección públicos | `text-2xl` → `text-3xl` / `sm:text-3xl`, `font-black tracking-tight` | `PaginaConoceClubs`, `PaginaInicio` | Verificado |
| Hero / nombre de landing | `text-3xl` → `sm:text-4xl` → `lg:text-5xl`, `font-black` | `PaginaConoceClubs` | Verificado |
| Texto corrido | `text-sm` / `text-xs` con `leading-relaxed` o `leading-relaxed` | Tarjetas, landing, pie | Verificado |
| Etiquetas de formulario | `text-xs font-bold uppercase tracking-widest text-slate-400` | `ThemeContext.labelCls`, `CampoSelect` | Verificado |
| Botones (acción genérica) | `font-bold uppercase tracking-widest`; primary a veces `font-black` | `BotonAccion` | Verificado |
| Microtexto / chips | `text-[10px]` o `text-[9px]`, `uppercase tracking-widest` | `TarjetaClub`, `Logotipo` | Verificado |

**Jerarquía típica en páginas públicas**

1. Nombre de página / club — `font-black`, escala grande.
2. Subtítulo — `tema.subtitle`, tamaño cuerpo.
3. Cuerpo — `text-sm`, `tema.subtitle` o `tema.text`.
4. Meta (categoría, badges) — `text-[10px] uppercase tracking-widest font-bold`.

> **Propuesta:** si se quiere una tipografía de marca (p. ej. Inter o similar), cargarla en `index.html` y mapearla a `font-sans` en CSS, sin romper el fallback del sistema.

---

## 4. Espaciado, contenedores y distribución

### 4.1 Contenedores horizontales (verificado)

| Contexto | Clases de padding | Origen |
|----------|-------------------|--------|
| Página pública (inicio, landing, club) | `px-6 sm:px-8 lg:px-12 xl:px-16` | `PaginaInicio` main, `PaginaConoceClubs`, `PiePagina` |
| Navbar (variante logo) | `px-6 sm:px-8 lg:px-10 xl:px-16` | `BarraNavegacion` |
| Navbar con filtros | `pl-6 md:pl-7 pr-6 sm:pr-8 lg:pr-10 xl:pr-16` | `BarraNavegacion` |
| Ancho útil de detalle de club | `max-w-7xl` vía prop `contenidoMax` en App | `App.jsx` |

### 4.2 Espaciado vertical (verificado)

| Elemento | Patrón |
|----------|--------|
| Secciones de landing (rediseño) | Bandas de fondo diferenciadas, sin `border-t`; `py-12 sm:py-16` (hero y encuesta con `lg:py-20`); ver §11 |
| Cabeceras de sección | `mb-8` / `mb-10` bajo título |
| Grids de tarjetas | `gap-4 sm:gap-5` |
| Root App | `pb-16 lg:pb-0` (compensa nav inferior móvil); paneles `lg:pt-[var(--navbar-height)]` |

### 4.3 Altura de navbar (verificado — `constants/limites.js`)

| Constante | px | Uso |
|-----------|-----|-----|
| `NAVBAR_HEIGHT` | 57 | Rutas generales |
| `NAVBAR_HEIGHT_LOGO` | 72 | Rutas de panel con logotipo completo |

Se aplica como `--navbar-height` en el root de `App.jsx`.

---

## 5. Bordes, radios, sombras y elevación

| Elemento | Radio / borde / sombra | Origen | Marca |
|----------|------------------------|--------|-------|
| Tarjeta de club | `rounded-xl` (mobile) / `rounded-2xl` (lg), `border`, `shadow-lg`; hover `shadow-2xl` + `scale-[1.03]` | `TarjetaClub.jsx` | Verificado |
| Card genérica (`cardCls`) | `rounded` según componente + `border-slate-700/50` o `border-slate-200` + `shadow-sm` en claro | `ThemeContext` | Verificado |
| Modal | `rounded-2xl`, borde, overlay `bg-black/60 backdrop-blur-sm` | `ModalBase.jsx` | Verificado |
| Botón `BotonAccion` | `rounded-xl` | `BotonAccion.jsx` | Verificado |
| Botones CTA landing / filtros | `rounded-full` | `PaginaConoceClubs`, `navPill`, badges | Verificado |
| Badge | `rounded-full border` | `Badge.jsx`, `clasesBadge` en tarjeta | Verificado |
| Inputs | `rounded-lg` | `ThemeContext.inputCls` | Verificado |
| Alertas | `rounded-xl border` | `Alerta.jsx` | Verificado |

> **Inconsistencia:** conviven `rounded-xl` y `rounded-2xl` para «tarjeta», y `rounded-lg` vs `rounded-xl` en controles. No hay un token único de radio.

---

## 6. Componentes reutilizables y variantes

| Componente | Archivo | Variantes / props clave |
|-------------|---------|-------------------------|
| `BotonAccion` | `ui/BotonAccion.jsx` | `primary` (ámbar), `danger`, `success`, `outline`; sizes `sm\|md\|lg` |
| `Alerta` | `ui/Alerta.jsx` | `error`, `success`, `warning`, `info` + children |
| `Badge` | `ui/Badge.jsx` | 8 colores; `sm` / `md` |
| `Spinner` | `ui/Spinner.jsx` | `sm\|md\|lg`; color por clase Tailwind (default ámbar) |
| `CampoTexto` / `CampoSelect` | `ui/Campo*.jsx` | Usan `inputCls` / `selectCls` del tema; label uppercase; error `text-red-400` |
| `ModalBase` / `ModalConfirmacion` | `ui/` | Portal, overlay, `rounded-2xl`, scroll interno |
| `TarjetaClub` | `clubes/tarjetas/TarjetaClub.jsx` | Activa / «próximamente» (opaca, sin hover) |
| `Heroe` | `clubes/Heroe.jsx` | Carrusel de diapositivas; alturas por breakpoint |
| `Icono` | `ui/Icono.jsx` | Mapa de paths; `strokeWidth` configurable |
| `BotonAccion` CTA interés | CSS `.boton-interes-cta` | Estado normal, hover, procesando, confirmado |
| `FondoEncuesta` | `encuestas/FondoEncuesta.jsx` | Marca de agua `lobounid.png` con tratamiento por tema |
| Landing | `pages/PaginaConoceClubs.jsx` | `BotonEncuesta` (activo / deshabilitado con `fondoPanel`), `BotonExplorar` (primario / contorno), `EnlaceSeccion`, `TarjetaPropuesta`, carrusel de propuestas / «Mostrar más», barra propia con `Logotipo` |

**Regla de uso (verificado en código):** en superficies con fondo propio, preferir `tema.cardCls` o los pares `modoOscuro ? 'bg-[#0e162c]…' : 'bg-white…'` ya existentes, no inventar fondos nuevos.

---

## 7. Estados de interacción

| Estado | Patrón habitual | Origen | Marca |
|--------|-----------------|--------|-------|
| Hover de icono navbar | `hover:text-amber-400` | `BarraNavegacion`, `MenuUsuario` | Verificado |
| Hover de tarjeta club | `hover:scale-[1.03] hover:shadow-2xl` + borde | `TarjetaClub` | Verificado |
| Active / press | `active:scale-[0.98]` o `active:scale-95` | `BotonAccion`, navbar, landing | Verificado |
| Disabled | `disabled:opacity-40 disabled:cursor-not-allowed` | `BotonAccion`; variantes con `opacity-55`/`opacity-70` | Verificado |
| Foco (inputs) | `focus:ring-2 focus:ring-amber-400/50` | `inputCls`, formularios | Verificado |
| Foco (CTA interés) | `:focus-visible` outline `#fcd34d` 3px | `index.css` `.boton-interes-cta` | Verificado |
| Foco (landing) | `focus-visible:ring-2 focus-visible:ring-amber-400/60` | `PaginaConoceClubs` | Verificado |
| Carga | `Spinner` + a veces overlay `fixed … bg-[#0b111e]` | `PaginaInicio`, landing, paneles | Verificado |
| Error de datos | `Alerta tipo="error"|"info"` + reintento o enlace | Formularios, landing, catálogo | Verificado |
| Encuesta | Barras `.anim-entrada` / `.anim-pop`; validación con borde rojo | `index.css`, `CampoPregunta` | Verificado |

> **Inconsistencia:** el foco visible no está unificado: unos controles usan `focus:ring`, otros `focus-visible:outline`/`ring` y muchos botones no declaran foco explícito (dependen del default del navegador).
>
> **Propuesta:** estandarizar `focus-visible:ring-2 focus-visible:ring-amber-400/60` (o `ring-amber-300` sobre ámbar sólido) en toda acción interactiva nueva.

---

## 8. Comportamiento adaptable y puntos de cambio

Tailwind 4 con breakpoints por defecto. Puntos **usados de forma consistente** en públicas:

| Breakpoint | Uso típico | Ejemplos |
|------------|------------|----------|
| base (<640px) | Una columna, paddings `px-6`, textos `text-sm`/`text-xs` | Landing, tarjetas, formulario encuesta |
| `sm:` 640px | Dos columnas en grids, padding `px-8`, textos un paso arriba | `sm:grid-cols-2`, `sm:text-3xl` |
| `md:` 768px | Navbar más holgada, nav inferior oculta en `lg`, tablet | `BarraNavegacion`, `NavegacionInferiorMovil` (`lg:hidden`) |
| `lg:` 1024px | Desktop: nav fija, grids de 3, padding `lg:px-12`, altura hero 21:9 | `Heroe`, catálogo, landing |
| `xl:` 1280px | Padding máximo de contenedor `xl:px-16` | Páginas públicas |

**Otras reglas de viewport (verificado — `index.css`)**

- Impresión: oculta `nav`, `aside`, `button`; usa `#lista-asistencia-print` y `.print-only`.
- Desktop de baja altura: `@media (min-width:1024px) and (max-height:900px)` limita `#hero > div` a `55vh`.

**Nav inferior móvil:** se oculta al bajar el scroll y reaparece al subir (`NavegacionInferiorMovil`).

> **Nota (verificado):** la clase `safe-area-bottom` se usa en la nav inferior pero **no está definida** en CSS del proyecto (grep sin definición). En iPhone el botón puede quedar bajo el home indicator.
>
> **Propuesta:** definir en `index.css` algo como `padding-bottom: env(safe-area-inset-bottom)` para esa clase, o retirarla si no se desea.

---

## 9. Imágenes, iconos y recursos de marca

| Recurso | Ruta | Uso | Origen |
|---------|------|-----|--------|
| Logo lobo (navbar) | `src/assets/logo-lobo.svg` importado | Navbar / splash | `Logotipo.jsx` |
| Marca de agua lobo | `public/lobounid.png` | Fondo encuesta y landing | `FondoEncuesta`, `PaginaConoceClubs` |
| Logo UNID (Portal) | `public/LogoU.png` | Botón «Portal» | `BotonPortal.jsx` |
| Favicon | `public/favicon.svg` | Pestaña | `index.html` |
| Imágenes de club | `imagen_portada` (URL o `/uploads/…`) | Tarjeta, detalle | `utils/imagen.js` → `obtenerUrlImagen` |
| Hero banners | API diapositivas | Carrusel `/` | `Heroe.jsx` |

**Reglas de imagen (verificado en código)**

- `obtenerUrlImagen` fuerza `https` en URLs absolutas y antepone `VITE_BACKEND_URL` a `/uploads/`.
- Imagen de club sin URL: fallback con icono `image` / `users` centrado (`TarjetaClub`, landing).
- Hero recomienda **1920×800** (~21:9), <500 KB (comentario en `Heroe.jsx`).
- Tratamiento de `lobounid.png`: en oscuro `opacity-25 brightness-110`; en claro `opacity-[0.14] brightness-[0.55] saturate-150` (`FondoEncuesta.jsx`).

**Iconos:** no se usa librería externa; siempre `Icono` + nombre del mapa. Nombres inexistentes hacen `console.warn` y no renderizan.

---

## 10. Accesibilidad y movimiento

| Práctica | Estado | Evidencia |
|----------|--------|-----------|
| HTML semántico (`main`, `section`, `header`, `article`, `ul`/`li`) | Parcial en landing y tarjetas; home usa `main` + secciones | `PaginaConoceClubs`, `PaginaInicio` |
| `aria-labelledby` en secciones | Landing | `PaginaConoceClubs` |
| `alt` en imágenes de club | Vacío decorativo cuando el título está junto | Landing / `TarjetaClub` |
| Roles de carga | `role="status"` + `sr-only` en landing | `PaginaConoceClubs` |
| Foco visible | Parcial (ver §7) | Varios |
| `prefers-reduced-motion` | Encuesta y CTA interés desactivan animaciones | `index.css` |
| Contraste | No auditado con herramienta; análisis solo por código | — |
| Navegación por teclado en carrusel hero | Flechas son `<button>` con `aria-label`; visibles en hover (desktop) | `Heroe.jsx` |

> **Limitación:** sin inspección en navegador no se certifica contraste WCAG ni orden de tabulación completo.

---

## 11. Landing de Clubs UNID Campeche

Ruta: **`/conoce-clubs`** (`App.jsx` → `PaginaConoceClubs`). Pública, sin `RutaProtegida`. La versión vigente es el **rediseño Mobile First** (octubre 2026), con la ronda posterior de mejora visual y animaciones: se verificó en navegador con Playwright/Chromium a 320, 390, 768 y 1440 px, en temas claro y oscuro (sin desbordes horizontales, sin errores de consola nuevos, foco, anclas y `prefers-reduced-motion` medidos).

### 11.1 Composición por bandas (Verificado)

La página deja de usar la secuencia «título + cajas con borde» y se compone en cinco bandas de fondo diferenciadas (sin `border-t`):

| Banda | Superficie oscura | Superficie clara | Contenido |
|-------|-------------------|------------------|-----------|
| A. Presentación | `bg-gradient-to-b from-[#0e162c] to-[#0b111e]` | `bg-gradient-to-b from-amber-100/70 to-slate-50` | kicker, h1, invitación, CTA principal, nota de encuesta, chips de secciones, panel de identidad y experiencias |
| B. Qué es un club | `bg-[#0e162c]` | `bg-white` | explicación + ejemplos con medallón de icono, título (tema) y actividad (sin badge) |
| C. Propuestas | fondo del tema | fondo del tema | carrusel lateral de tarjetas en móvil (todos los clubes) + grid con «Mostrar más» en escritorio, orden intercalado por categoría + estados. **Sin enlaces al catálogo ni al detalle** (tarjetas informativas) |
| D. Encuesta | `bg-[#18223f]` | `bg-[#0e162c]` | banda invertida **inmediatamente después de las propuestas** (acción evidente tras explorar): título, propósito, aclaración, CTA principal y 4 chips de propósito (pills compactas en móvil, tarjetas en `sm+`) |
| E. Formación (VIVE) | panel eco de marca sobre fondo del tema | panel eco de marca sobre fondo del tema | contexto del Modelo de Formación Integral **después de la encuesta** (versión compacta): kicker, intro breve, 6 valores como pills neutras con punto ámbar, 3 dimensiones en una columna en móvil y frase puente neutra con filete ámbar. Sin chip en la navegación |
| F. Acerca | fondo del tema | fondo del tema | propósito, equipo con iniciales, acciones finales (encuesta + explorar; **sin portal ni catálogo**) |

**Recorrido (DOM y visual):** hero → qué es un club → propuestas → encuesta → MFI → acerca. La encuesta no va después del MFI.

### 11.2 Presentación Mobile First (Verificado)

- Una columna en móvil; `lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]` (texto | panel de marca) en escritorio.
- Escala del h1 medida: 28 px (320–390), 36 px (768), 48 px (1440); `text-balance` para el título.
- CTA principal condicionado a `ENCUESTA_SLUG`: sin slug, «Explorar los clubes» en ámbar y la encuesta se comunica como nota secundaria (no como botón falso); con slug, el primario pasa a «Responder la encuesta».
- Navegación de secciones: chips-ancla (`EnlaceSeccion`, copy en `LANDING.secciones`); en móvil (< `lg`) compactos y con `flex-1 justify-center whitespace-nowrap` para **estirarse y ocupar todo el ancho sin dejar espacios ni deslizar** (medido a 320–768: `scrollWidth == clientWidth`, texto en una línea, 36 px de alto); en escritorio (`lg:flex-none`) pills de ancho automático con tamaño respetivo —`lg:text-xs lg:px-4 lg:py-2 lg:min-h-[44px]`—. El nav usa `flex-nowrap overflow-x-auto` + `.nf-scroll` y `w-full` (sin esto, en la columna `items-start` se estira y desborda el viewport). Cada sección declara `scroll-mt-8` (sin navbar sticky; el ancla deja su título con un respiro de 32 px).
- Panel de identidad y experiencias (`heroPanel` en `landing.js`): sin badges de categorías. Compone `public/lobounid.png` como ancla de identidad + «Clubs Lobos Rojos» (con relación explícita: «Así se presenta la comunidad de clubes de UNID Campeche», ya que no hay definición formal en los documentos del repo) + 4 tiles de experiencias concretas (`Entrenar y competir`, `Crear y expresarse`, `Construir proyectos`, `Servir a la comunidad`) + conteo real de propuestas (`heroPanel.propuestasCount`). Gradiente radial ámbar `rgba(251,191,36,0.16)`, radio `rounded-2xl`. No se usan fotografías genéricas ni fotos de actividades inexistentes: la composición es tipografía + color + marca + datos reales.

### 11.3 Propuestas: carrusel móvil, grid y estados (Verificado)

- **Sin filtros por categoría** (retirados junto a sus textos de `landing.js`).
- **Sin enlaces de navegación de tarjeta:** se retiraron «Ver en el catálogo», el mapeo `club.link` y el enlace «Ir al catálogo» del estado de error (solo queda «Reintentar»). Las tarjetas son informativas; se distingue «En el catálogo» vs «En propuesta» como estado textual.
- **Orden intercalado por categoría** (`OrdenarClubes` en `PaginaConoceClubs`): round-robin sobre el orden canónico de categorías (Deporte y movimiento → Arte y cultura → Tecnología y juegos → Comunidad), con orden alfabético dentro de cada una. Evita que el grid/carrusel muestre todas las tarjetas de una sola categoría seguidas. No se usa bloque `sort` (que reordenaría el estado y rompería el conteo estable).
- Móvil (< `lg`): un solo carrusel lateral con **todos** los clubes, replicando el patrón de las filas del catálogo (`PaginaInicio`): `nf-scroll -mx-6 sm:-mx-8 flex gap-3 overflow-x-auto`, scrollbar oculto (`scrollbarWidth: 'none'` + `.nf-scroll::-webkit-scrollbar { display: none }`), tarjetas `shrink-0 w-56`.
- Escritorio (`lg+`): grid `lg:grid-cols-2 xl:grid-cols-3` con los primeros **6** clubes; si hay más, botón **«Mostrar más»** (`LANDING.propuestas.mostrarMas`) que revela de seis en seis (`PROPUESTAS_VISIBLES`); el botón no aparece en móvil.
- Carga: `Spinner` con `role="status"`; vacío general con texto propio; error con botón **Reintentar** + enlace al catálogo.
- La carga hace un reintento automático único (2.5 s) antes de mostrar el error, para absorber fallos transitorios del servicio (se detectó 500 intermitente en el backend de Render, fuera de este repositorio).
- `src/services/api-core.js` ahora admite `VITE_API_URL` con el backend de Render como valor por defecto (sin cambiar el comportamiento desplegado).
- **Imágenes de tarjetas:** `TarjetaPropuesta` declara `onError` que cambia a un placeholder con icono sin reintentos (protege contra 404 del backend de `obtenerUrlImagen` cuando `VITE_BACKEND_URL` no está definida y la URL queda relativa a `/uploads/...`). No se modifica la configuración de despliegue; el fallback es de UI.

### 11.4 Montaje fuera del layout del sistema (Verificado)

- `/conoce-clubs` se sirve con un **return temprano en `App.jsx`** (mismo patrón que `/encuesta/:slug`): la página declara su propio `<Routes>` y se monta **sin el layout del sistema** — sin `BarraNavegacion`, sin `NavegacionInferiorMovil`, sin `SplashScreen` y sin `ModalNoticias`/`ModalActualizaciones`. Permisos y demás rutas no cambian.
- La landing lleva su **propia barra**: solo `Logotipo` (componente compartido, estilos del tema), estática (no sticky) y **sin controles del sistema** (sin hamburguesa, portal, notificaciones, dashboard ni botón de tema; el tema usa el default/`localStorage`).
- Sin accesos salientes al catálogo ni al portal principal en esta etapa (decisión explícita de producto); el botón «Ir al portal» se retiró de la landing. La barra propia solo conserva `Logotipo` estático.
- Anclas con `scroll-mt-8`: no hay cabecera fija que compensar.

### 11.5 Foco, contraste y movimiento (Verificado en navegador; contraste analizado por código)

- Acciones nuevas: `focus-visible:ring-2 focus-visible:ring-amber-400/80`; en botones ámbar sólidos, `ring-[#0e162c] ring-offset-2 ring-offset-amber-400` (anillo legible sobre cualquier banda, sin depender del tema).
- Tabulación medida en Chromium: los controles de la landing muestran anillo de foco y el orden sigue la lectura. El botón «Menú» preexistente no declara foco explícito (inconsistencia #2, fuera del alcance de la landing).
- Kicker y títulos de ejemplos: `text-amber-400` en oscuro y `text-amber-600` en claro (corrige el uso anterior de `amber-400` sobre blanco, con contraste insuficiente).
- **Jerarquía y ámbar reservado (Verificado en navegador):** el ámbar se concentra en kicker, CTA principal, medallones de iconos y el conteo del panel; títulos de dimensiones MFI y de ejemplos de clubes usan `tema.title` (texto neutro del tema) para bajar densidad cromática. Los pills de valores MFI son neutros (fondo sutil + solo punto ámbar como acento); la frase puente MFI usa borde izquierdo ámbar en lugar de texto ámbar.

### 11.6 Animaciones y microinteracciones (Verificado en navegador)

- **Reveal por scroll:** clases globales `.landing-reveal` / `.landing-reveal--visible` en `index.css` (opacidad 0→1 + `translateY(10px)→0`, 220 ms, ease-out). Se aplican por JS solo si existe `IntersectionObserver` y no hay `prefers-reduced-motion`; si el JS falla, el contenido queda visible sin animación (progresivo). Declaradas con `data-reveal` en: sección B, sección C (`max-w-6xl`), panel MFI y sección F; no en hero ni en la banda de encuesta.
- **Smooth scroll:** clase temporal `landing-scroll-smooth` en `html` al tocar un chip-ancla (se retira al terminar), respetando `prefers-reduced-motion`.
- **Microinteracciones:** botones con `active:scale-[0.98]` (BotonEncuesta, BotonExplorar, «Mostrar más»); tarjetas de propuestas **informativas** (sin hover de elevación ni `focus-within`, sin enlaces al catálogo ni al detalle).
- **`prefers-reduced-motion: reduce`:** media query en `index.css` desactiva reveal y smooth scroll; el arnés verificó 0 clases de reveal, `opacity: 1` y `scroll-behavior: auto` con la preferencia activa. Verificado en navegador (Playwright con `reducedMotion: 'reduce'`).

### 11.7 Reglas que siguen vigentes

- Copy editable centralizado en `src/config/landing.js` (incluye `secciones`, `propósitos` de la encuesta, estados de propuestas, `heroPanel`, `equipoTitulo` y el bloque `mfi` del Modelo de Formación Integral); el slug de encuesta no se hardcodea en componentes.
- Sección MFI/VIVE (e. en la tabla): contenido adaptado del modelo de UNID en versión **compacta**; aparece **después de la encuesta** (no como puente entre propuestas y encuesta). En móvil (< `sm`) las dimensiones y los bloques se distribuyen en una columna; los valores en `flex-wrap` con separación suficiente; sin alturas fijas ni overflow horizontal. Reutiliza el panel de eco radial del hero y no agrega un chip a la navegación.
- Propuestas desde la **misma API** de clubes; se distingue «En el catálogo» vs «En propuesta» sin afirmar aprobación; se ocultan los estatus 3.
- Encuesta con estado honesto mientras `ENCUESTA_SLUG` sea `null` (chip «Encuesta en preparación» y notas; sin `#` ni rutas inventadas) y aclaración de que responder no es inscripción.
- Equipo: Ángel Pecero, Jorge Martínez y Gustavo Gallegos, sin cargos inventados (iniciales tipográficas).
- Contenedores públicos `px-6 sm:px-8 lg:px-12 xl:px-16`; iconos vía componente `Icono`; badges de categoría con `clasesBadge`.
- No trasladar densidad de paneles a la landing; no inventar horarios, cupos ni fotos de campus; no debilitar rutas protegidas.

---

## 12. Paneles administrativos — diferencias (resumen)

Los paneles comparten amber + azul noche, pero cambian densidad y layout:

| Rasgo | Público | Panel |
|-------|---------|-------|
| Layout | Página fluida + navbar superior | `NavegacionPanel` sticky `w-64` en `md+` con fondo `#0a1128` (oscuro) o white |
| Nav móvil | `NavegacionInferiorMovil` | Tabs horizontales con scroll oculto (`nav-tabs-hide-scroll`) |
| Tablas | No aplican | `tableBg` / `thCls` / `tdCls` del tema; tarjetas apiladas en móvil |
| Inputs | A veces libres | `inputCls` / `selectCls` de forma más sistemática |
| Estadísticas | — | `TarjetaStat`, gráficas (Recharts) con tooltips `bg-[#0e162c]` |

Al diseñar pantallas de panel, reutilizar `ThemeContext` (`sbBg`, `tableBg`, `inputCls`) y no el lenguaje de hero/tarjetas del catálogo.

---

## 13. Inconsistencias, pendientes y mantenimiento

### 13.1 Inconsistencias detectadas en código

| # | Tema | Detalle | Severidad |
|---|------|---------|-----------|
| 1 | Radios | `rounded-lg` / `xl` / `2xl` / `full` sin regla única por tipo de control | Media |
| 2 | Foco | `focus:ring` vs `focus-visible` vs default | Media |
| 3 | Superficie oscura | Cuatro azules (`#0a1128`, `#0b111e`, `#0e162c`, `#18223f`) correctos pero sin nombres semánticos compartidos | Baja |
| 4 | `safe-area-bottom` | Clase usada sin CSS | Media (móvil iOS) |
| 5 | `App.css` | Archivo vacío; no se importa de forma efectiva con estilos | Baja |
| 6 | Categoría Tecnología | Tilde en UI vs seed sin tilde | Baja |
| 7 | CTAs | Botones de acción con y sin `uppercase`/`font-black` según contexto | Baja |

### 13.2 Estado de verificación visual

- **Landing `/conoce-clubs`:** verificada en navegador (Playwright/Chromium) a 320/375/390/425/768/1440 px en tema oscuro y claro: sin desbordes horizontales, montaje fuera del layout (sin navbar del sistema, nav inferior ni splash), barra propia, chips en una línea sin deslizar desde 320 px, carrusel móvil y grid + «Mostrar más» con orden intercalado (D-C-T), panel hero con identidad y 4 experiencias, fallback de imagen rota (un solo request a la URL fallida), **orden de secciones hero → qué es un club → propuestas → encuesta → MFI → acerca**, CTA de encuesta accesible pronto en móvil, sección MFI en una columna en móvil, animaciones reveal con `prefers-reduced-motion` respetado (0 clases, `opacity: 1`, `scroll-behavior: auto`), anclas y foco operativos, sin errores de consola nuevos (solo el 404 simulado del mock de prueba). Queda pendiente una pasada de contraste con herramienta especializada y la prueba end-to-end con el backend vivo de Render (500 intermitente, fuera de este repositorio).
- Contraste real de `text-slate-400` sobre `#0b111e` en cuerpos largos (fuera de landing): no auditado con herramienta.
- Tabulación completa en `/encuesta/:slug`: no auditada en esta iteración.

### 13.3 Reglas de mantenimiento

1. **Antes de crear un componente de UI nuevo:** revisar `src/components/ui` y los pares de color de `ThemeContext`.
2. **Cambios de color global:** actualizar `ThemeContext` y grep de hex duplicados; no parchear solo una pantalla.
3. **Animaciones nuevas:** incluir `@media (prefers-reduced-motion: reduce)` como ya hacen encuesta y CTA de interés.
4. **Imágenes:** pasar por `obtenerUrlImagen`; respetar recomendación del hero 1920×800.
5. **Landing:** el copy editable vive en `src/config/landing.js`; no hardcodear el slug de la encuesta en componentes.
6. **Documentar aquí** cualquier regla visual nueva verificada; marcar **Propuesta** lo que aún no se implemente.

---

## Archivos inspeccionados (principales)

| Archivo | Motivo |
|---------|--------|
| `src/index.css` | Animaciones, scrollbars, print, reduced-motion, CTA interés |
| `src/contexts/ThemeContext.jsx` | Tokens de tema claro/oscuro |
| `src/App.jsx`, `src/main.jsx` | Root, tipografía, rutas, providers |
| `src/constants/colores.js`, `limites.js`, `clubes.js` | Badges, alturas navbar, catálogos UI |
| `src/components/ui/*` | Botones, badges, campos, modal, spinner, iconos |
| `src/components/layout/*` | Navbar, pie, nav inferior, sidebar panel |
| `src/components/clubes/*` | Hero, tarjeta, detalle, secciones |
| `src/components/encuestas/*` | Fondo, campo de pregunta |
| `src/pages/PaginaInicio.jsx`, `PaginaEncuesta.jsx`, `PaginaConoceClubs.jsx`, `PaginaCalendario.jsx` | Públicas representativas |
| `src/config/landing.js` | Contenido landing |
| `public/*`, `src/assets/*` | Recursos de marca |
| `index.html`, `vite.config.js`, `package.json` | Fuentes, Tailwind 4, sin config extra |

---

*Documento generado a partir del código en la rama `feat/landing-clubs-campeche` (línea base `develop` + landing). Actualizar al cambiar tema, componentes compartidos o la landing.*
