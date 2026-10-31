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
| `ModalBase` / `ModalConfirmacion` | `ui/` | Portal, overlay, `rounded-2xl`; **única** zona de scroll en el div interno (`max-h-[85vh] overflow-y-auto p-5 sm:p-8`), panel solo marco (props `panelClassName` / `innerClassName` para modales que gestionan su propio alto, p.ej. `ModalActualizaciones`); bloquea el scroll del body (`useBloqueoScroll`) |
| `TarjetaClub` | `clubes/tarjetas/TarjetaClub.jsx` | Activa / «próximamente» (opaca, sin hover) |
| `Heroe` | `clubes/Heroe.jsx` | Dual: móvil (< md) carrusel de tarjetas verticales 3:4 (~90% del ancho) con texto sobre fundido al fondo del tema, flechas laterales visibles y indicadores con target 24×24; desktop banner a sangre 21:9 con crossfade y flechas; imagen móvil opcional por slide (`<picture>`, §11.8) |
| `Icono` | `ui/Icono.jsx` | Mapa de paths; `strokeWidth` configurable |
| `BotonAccion` CTA interés | CSS `.boton-interes-cta` | Estado normal, hover, procesando, confirmado |
| `FondoEncuesta` | `encuestas/FondoEncuesta.jsx` | Marca de agua `lobounid.png` con tratamiento por tema |
| `SubirImagen` | `ui/SubirImagen.jsx` | `obligatorio`, `onRemove` (botón «Quitar»), `ayuda` (texto bajo el control) |
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
| `lg:` 1024px | Desktop: nav fija, grids de 3, padding `lg:px-12`, altura hero 21:9; el hero del catálogo conmuta de carrusel de tarjetas (< md) a banner | `Heroe`, catálogo, landing |
| `xl:` 1280px | Padding máximo de contenedor `xl:px-16` | Páginas públicas |

**Otras reglas de viewport (verificado — `index.css`)**

- Impresión: oculta `nav`, `aside`, `button`; usa `#lista-asistencia-print` y `.print-only`.
- Desktop de baja altura: `@media (min-width:1024px) and (max-height:900px)` limita `.hero-catalogo > div` a `55vh` (no usar `#hero`: la landing también declara ese id).

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
| Hero banners | API diapositivas (`url_imagen` + `url_imagen_movil` opcional) | Carrusel `/` | `Heroe.jsx`, `routes/diapositivasHero.js` |
| Hero landing (foto protagonista) | `LANDING.hero.imagen` (asset en `public/` o null) | Banda A de `/conoce-clubs` | `PaginaConoceClubs`, `src/config/landing.js` |
| Fotos de actividades | `LANDING.actividades.items[].imagen` (`public/misiones3.jpg`, `public/trineo-sueños2.jpg`, `public/InterUNID.jpeg` 800×533) | Pósteres banda F | `PaginaConoceClubs`, `src/config/landing.js` |

**Reglas de imagen (verificado en código)**

- `obtenerUrlImagen` fuerza `https` en URLs absolutas y antepone `VITE_BACKEND_URL` a `/uploads/`.
- Imagen de club sin URL: fallback con icono `image` / `users` centrado (`TarjetaClub`, landing).
- Hero recomienda **1920×800** (~21:9), <500 KB (comentario en `Heroe.jsx`).
- **Imagen móvil del carrusel (Verificado en código; pendiente de verificación visual):** cada diapositiva admite `url_imagen_movil` opcional (`diapositivas_hero.url_imagen_movil`, migración aditiva `backend/migrations/migrate-diapositivas-hero-movil.sql`, no ejecutada remotamente). Con imagen móvil, `Heroe` usa `<picture>`: `source media="(min-width: 1024px)"` con la de escritorio y `<img object-cover object-center>` (alt vacío, `aria-hidden`) para móvil; sin ella se conserva el `background-image` actual (`bg-contain` móvil / `bg-cover lg`). La recomendación de tamaño para la imagen móvil es retrato compuesto para `object-cover` (p. ej. ~1080×1350); el copy de recomendaciones vive en el modal admin (`ayuda` de `SubirImagen`). **Alcance (Inconsistencia de alcance, registrada):** `url_imagen_movil` afecta **solo al carrusel de `/`** (`Heroe.jsx`, montado únicamente en `PaginaInicio`); la landing `/conoce-clubs` usa su propio hero estático (`LANDING.hero.imagen` en `src/config/landing.js`, §11.8) y no consume `diapositivas_hero`. No es un fallo del carrusel: son dos héroes distintos.
- Tratamiento de `lobounid.png`: en oscuro `opacity-25 brightness-110`; en claro `opacity-[0.14] brightness-[0.55] saturate-150` (`FondoEncuesta.jsx`).
- **Hero móvil del catálogo (verificado con CDP/headless; revisión visual humana pendiente):** por debajo de `lg`, `Heroe` renderiza un carrusel de tarjetas verticales `aspect-[3/4]` de `w-[86vw]` (`max-w-[440px]`, `rounded-2xl`) dentro de una pista `<ul>` con `scroll-snap-type: x mandatory`, `gap-2` y `px-6 sm:px-8` (barra oculta con `.nf-scroll` + `scrollbarWidth: none`). Cada tarjeta: imagen `object-cover` a pantalla completa (misma selección `<picture>` que escritorio: `url_imagen_movil` con fallback a `url_imagen`), degradado inferior `from-black/90 via-black/45 to-transparent` y bloque HTML encima con `h2` (`line-clamp-2`), subtítulo (`line-clamp-3`) y CTA ámbar «Explorar clubes» → `#catalogo` (scroll con offset `NAVBAR_HEIGHT`, respetando `prefers-reduced-motion`). Debajo de las tarjetas: indicadores tipo píldora (activa ámbar 24 px, inactivas slate 8 px) con target táctil de 24×24 px (`h-6 w-6`), `aria-label` y `aria-current`. El autoplay de 8 s centra la tarjeta con `scrollTo` (vuelto última→primera sin animación) y el `scroll` del usuario devuelve el control (indicador sincronizado, temporizador reiniciado). Desktop conserva el banner crossfade + flechas sin cambios; ambas variantes comparten estado y `id="hero"` (clase `hero-catalogo`).

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
| Navegación por teclado en carrusel hero | Flechas son `<button>` con `aria-label`; visibles en hover (desktop); en móvil los indicadores son `<button>` con `aria-label`, `aria-current` y target 24×24 px | `Heroe.jsx` |

> **Limitación:** sin inspección en navegador no se certifica contraste WCAG ni orden de tabulación completo.

---

## 11. Landing de Clubs UNID Campeche

Ruta: **`/conoce-clubs`** (`App.jsx` → `PaginaConoceClubs`). Pública, sin `RutaProtegida`. La versión vigente es el **rediseño Mobile First** (octubre 2026), con la ronda posterior de mejora visual y animaciones: se verificó en navegador con Playwright/Chromium a 320, 390, 768 y 1440 px, en temas claro y oscuro (sin desbordes horizontales, sin errores de consola nuevos, foco, anclas y `prefers-reduced-motion` medidos).

### 11.1 Composición por bandas (Verificado)

La página deja de usar la secuencia «título + cajas con borde» y se compone en cinco bandas de fondo diferenciadas (sin `border-t`):

| Banda | Superficie oscura | Superficie clara | Contenido |
|-------|-------------------|------------------|-----------|
| A. Presentación | `bg-[#0b111e]` plano con foto, o `bg-gradient-to-b from-[#0e162c] to-[#0b111e]` sin foto | `bg-slate-50` plano con foto, o `bg-gradient-to-b from-amber-100/70 to-slate-50` sin foto | **foto protagonista opcional** (`LANDING.hero`; móvil: bloque de foto arriba + fundido inferior, texto debajo; lg+: foto a sangre con degradado editorial izquierda→derecha), kicker, h1, invitación, CTA principal, nota de encuesta, chips de secciones, panel de identidad y experiencias (vidrioso con foto, opaco sin ella) |
| B. Qué es un club | `bg-[#0e162c]` | `bg-white` | explicación + ejemplos con medallón de icono, título (tema) y actividad (sin badge) |
| C. Propuestas | fondo del tema | fondo del tema | carrusel lateral de tarjetas en móvil (todos los clubes) + grid con «Mostrar más» en escritorio, orden intercalado por categoría + estados. **Sin enlaces al catálogo ni al detalle** (tarjetas informativas) |
| D. Encuesta | `bg-[#18223f]` | `bg-[#0e162c]` | banda invertida **inmediatamente después de las propuestas** (acción evidente tras explorar): título, propósito, aclaración, CTA principal y 4 chips de propósito (pills compactas en móvil, tarjetas en `sm+`) |
| E. Formación (VIVE) | panel eco de marca sobre fondo del tema | panel eco de marca sobre fondo del tema | contexto del Modelo de Formación Integral **después de la encuesta** (versión compacta): kicker, intro breve, 6 valores como pills neutras con punto ámbar, 3 dimensiones en una columna en móvil y frase puente neutra con filete ámbar. Sin chip en la navegación |
| F. Actividades | `bg-[#0e162c]` | `bg-white` | «Más formas de vivir tu universidad» (tras MFI): 3 pósteres informativos (Misiones, Trineo de los Sueños, InterUNID) de actividades **distintas a los clubes**. Cada póster: foto a sangre en proporción `aspect-[4/5]` con `object-position` configurable (o fallback gradiente + medallón ámbar), degradado inferior progresivo `from-[#0b111e]` con `via/65` → transparente e **título + descripción superpuestos en HTML** (sin corte horizontal). Disposición: móvil (< `md`) fila con sangrado y desplazamiento horizontal manual (`nf-scroll`, contenedor enfocable con `tabIndex`); **`md+`: rejilla de 3 columnas que llena el contenedor centrado (justificada)**, sin espacio muerto a los lados. **Sin enlaces, hover de elevación ni cursor pulsable**; sin fechas ni convocatorias inventadas |
| G. Acerca | fondo del tema | fondo del tema | propósito, **acciones finales (encuesta + explorar) en la primera columna, empujadas al fondo con `mt-auto pt-6` para alinearse con la última tarjeta del equipo (Gustavo Gallegos) en escritorio** (en móvil quedan tras el texto), equipo con iniciales en la segunda columna (**sin portal ni catálogo**) |

**Recorrido (DOM y visual):** hero → qué es un club → propuestas → encuesta → MFI → actividades → acerca. La encuesta no va después del MFI.

### 11.2 Presentación Mobile First (Verificado)

- Una columna en móvil; `xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]` (texto | panel de marca) desde 1280px (antes en `lg`; en 1024–1280 el panel se comprimía y ocultaba tiles y pills, ahora se apila).
- Escala del h1 medida: 28 px (320–390), 36 px (768), 48 px (1440); `text-balance` para el título.
- CTA principal condicionado a `ENCUESTA_SLUG`: sin slug, «Explorar los clubes» en ámbar y la encuesta se comunica como nota secundaria (no como botón falso); con slug, el primario pasa a «Responder la encuesta».
- Navegación de secciones: chips-ancla (`EnlaceSeccion`, copy en `LANDING.secciones`); fondo blanco con letras oscuras (`bg-white text-[#0e162c]` en oscuro, `bg-white text-slate-900 border-slate-200 shadow-sm` en claro), hover ámbar-50; en móvil/tablet (< `xl`) compactos y con `flex-1 justify-center whitespace-nowrap` para **estirarse y ocupar todo el ancho sin dejar espacios ni deslizar** (medido a 320–768: `scrollWidth == clientWidth`, texto en una línea, 36 px de alto); en escritorio (`xl:flex-none`) pills de ancho automático con tamaño respetivo —`xl:text-xs xl:px-4 xl:py-2 xl:min-h-[44px]`—. El nav usa `flex-nowrap overflow-x-auto` + `.nf-scroll` y `w-full` (sin esto, en la columna `items-start` se estira y desborda el viewport). Cada sección declara `scroll-mt-8` (sin navbar sticky; el ancla deja su título con un respiro de 32 px).
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
- Sección MFI/VIVE (e. en la tabla): contenido adaptado del modelo de UNID en versión **compacta**; aparece **después de la encuesta** (no como puente entre propuestas y encuesta). En móvil (< `sm`) las dimensiones y los bloques se distribuyen en una columna. **Los 6 valores: grid `grid-cols-2 min-[375px]:grid-cols-3` en TODOS los tamaños (3 por línea / 2 filas desde 375 px, como en móvil M; a 320–374 px caen a 2 porque «Solidaridad» no cabe 3 veces), acotado a `max-w-2xl` en escritorio; pills con fondo grande (`w-full justify-center`, `py-2 sm:py-2.5`, texto `text-[11px] sm:text-xs`, `px-1 sm:px-3` + `tracking-tight` en móvil para que el punto y el texto quepan en la celda de ~93 px)**; sin `flex-wrap` en escritorio; sin alturas fijas ni overflow horizontal. Reutiliza el panel de eco radial del hero y no agrega un chip a la navegación.
- Propuestas desde la **misma API** de clubes; se distingue «En el catálogo» vs «En propuesta» sin afirmar aprobación; se ocultan los estatus 3.
- Encuesta con estado honesto mientras `ENCUESTA_SLUG` sea `null` (chip «Encuesta en preparación» y notas; sin `#` ni rutas inventadas) y aclaración de que responder no es inscripción.
- Equipo: Ángel Pecero, Jorge Martínez y Gustavo Gallegos, sin cargos inventados (iniciales tipográficas).
- Contenedores públicos `px-6 sm:px-8 lg:px-12 xl:px-16`; iconos vía componente `Icono`; badges de categoría con `clasesBadge`.
- No trasladar densidad de paneles a la landing; no inventar horarios, cupos ni fotos de campus; no debilitar rutas protegidas.

### 11.8 Hero fotográfico y banda de actividades (Verificado en código; pendiente de verificación visual)

- **Hero con fotografía protagonista** (referencia de composición: heroes editoriales tipo ViX, sin copiar su interfaz): una sola imagen configurable en `LANDING.hero = { imagen, alt, focal }` (`src/config/landing.js`). Sin carrusel, sin video, sin parallax.
  - Móvil (< `lg`): la foto va **en flujo** con alto flexible por breakpoint (`h-[300px] sm:h-[360px]`, `object-cover` + `object-position: focal`) y **degradado inferior fuerte** (`h-44`, `from` sólido del tema → `via/70-80` → transparente); el contenido de la landing **sube sobre esa zona oscurecida** (`-mt-16 sm:-mt-20`, `lg:mt-0`) integrando foto y texto en una sola pieza, sin corte visible y con los CTAs claramente visibles sobre el degradado. Sin foto configurada: sin margen negativo (fallback actual intacto).
  - Escritorio (`lg+`): un solo `<img>` pasa a **fondo absoluto** (`lg:absolute lg:inset-0`) con **degradado editorial** izquierda→derecha (`from` sólido del tema → `to` translúcido) que garantiza lectura sin ocultar toda la foto. El panel de identidad toma superficie **vidriosa** (`backdrop-blur-md` + fondo translúcido); sin foto conserva el panel opaco actual.
  - `fetchPriority="high"` + `decoding="async"` (foto de primera pantalla); `onError` → **fallback diseñado** (hero de gradiente + panel actual), sin salto de layout. `alt` vacío ⇒ decorativa (`aria-hidden`); con texto ⇒ imagen protagonista descriptiva.
  - `focal` se ajusta **por imagen** (no un recorte único para todas).
- **Banda F «Más formas de vivir tu universidad»** (ver §11.1): pósteres informativos de actividades universitarias reales distintas a los clubes (Misiones, Trineo de los Sueños, InterUNID), copy y rutas de imagen en `LANDING.actividades`. Reglas del póster: informativos (sin `<a>`, sin hover de elevación, sin `cursor-pointer`); sin fechas, cupos, responsables ni convocatorias; foto a sangre `aspect-[4/5]` con `loading="lazy"`; degradado de lectura oscuro inferior progresivo idéntico en ambos temas; título + texto **superpuestos en HTML** sobre la foto (sin texto incrustado en la imagen). Copy con **longitudes iguales (~69–73 caracteres ≈ 3 líneas a 320/375/768 px)** en `landing.js`: los 3 textos miden lo mismo para que **los títulos queden alineados a la misma altura** en las tarjetas y el texto **no tape la fotografía en móvil** (zona de texto: `p-4 sm:p-5`, título `text-base sm:text-lg`); `line-clamp-4` actúa solo como red de seguridad y no recorta el texto vigente; fallback gradiente + medallón ámbar cuando `imagen` es `null` o falla, conservando el mismo formato y lectura. Disposición: **móvil (< `md`): fila con sangrado a los bordes** (`-mx` + `nf-scroll`, tarjetas `w-[70vw] max-w-[300px]`, parte de la siguiente visible; contenedor con `aria-label` + `tabIndex={0}` para desplazarse con teclado; sin autoplay ni carruseles anidados); **`md+`: rejilla de 3 columnas (`md:grid-cols-3`) que llena el contenedor centrado — justificada, sin espacio muerto a los lados** (~221 px a 768, ~296 px a 1024, ~370 px a 1440). Si en el futuro se agrega una 4.ª actividad, el grid de 3 envolvería el excedente (3+1) y habría que revisarlo. Fotografías reales aportadas por el equipo en `public/`: Misiones, Trineo **e InterUNID** (`InterUNID.jpeg`, 800×533, apaisada; recorte 4:5 centrado conserva el grupo con letrero de campus; fallback queda solo por si la carga falla). Copy de Misiones: borrador neutro a la espera de revisión; Trineo resumido del texto aportado; InterUNID: borrador de **experiencia documentada** (publicación institucional del 25 de junio de 2019) — **no** es convocatoria vigente, sin afirmar participación actual de Campeche, sin fechas/sedes/requisitos, sin lista de disciplinas (la publicación de referencia cita ejemplos como fútbol, voleibol, basquetbol, fotografía, dibujo y canto, pero no se presentan como oferta actual). Textos con la misma longitud (~69–73 caracteres) para que las tres tarjetas queden alineadas; InterUNID conserva «Experiencia documentada» sin lista de disciplinas. **Retiros eliminado** de la banda (no existe como actividad operativa). Sin botón de inscripción.
- Chip «Actividades» añadido a `LANDING.secciones` (5 chips en móvil; `EnlaceSeccion` los estira con `flex-1`).

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

### 12.1 Gráficas ejecutivas (Verificado en navegador con datos de prueba)

- Motor: Recharts ya instalado. `MarcoGrafica` y `graficas.css` comparten superficies azul noche/blanco, títulos en caja normal, rejilla discreta y acentos ámbar/azul según el tema. Los colores se definen dentro de `.grafica-unid`.
- Barras horizontales para comparar clubes, asistencia y respuestas; barras agrupadas para las series mensuales. Los valores se muestran directamente y los nombres completos permanecen en el tooltip y en **Ver datos**. Desde nueve categorías se muestran ocho y el botón **Ver todos** permite consultar el resto.
- Pastel para participación en clubes y preguntas de opción única o licenciatura cuya suma coincide con las respuestas de la pregunta. Las preguntas de opción múltiple conservan barras y explican su base; los porcentajes pueden superar 100 % al sumarse. Se cuentan envíos de respuestas, sin afirmar que sean personas distintas.
- El pastel muestra cantidades y porcentajes junto a la leyenda. Más de seis categorías positivas se agrupan en cinco opciones y **Otras opciones**, conservando el total y todas las filas en **Ver datos**. Cero respuestas y base desconocida tienen mensajes diferenciados, sin sectores ficticios.
- Ocupación: eje fijo de 0 a 100 %, cantidades y cupo en el tooltip. La etiqueta conserva el porcentaje real cuando existe sobrecupo. Los ceros conservan su etiqueta sin dibujar una barra artificial; una base no disponible se presenta como **Sin registros**.
- Verificación: resumen en claro/oscuro; encuestas y evolución mensual a 320, 390, 768 y 1440 px sin desbordamiento de página. Se probaron el selector Barras/Pastel, tooltips, tablas, expansión, opciones múltiples, cero respuestas y sobrecupo con rutas API interceptadas. Esta revisión no valida registros de producción.

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
| 8 | Modales (`ModalBase`) | Panel y div interno llevaban **ambos** `max-h-[85vh] overflow-y-auto p-4 sm:p-8` → doble barra de scroll y doble padding en las 15 llamadas a `ModalBase`. **Corregido:** panel solo marco visual, único div interno con scroll/padding (`p-5 sm:p-8`), prop `innerClassName` para `ModalActualizaciones` (layout propio) y bloqueo del scroll del body. Pendiente verificación visual | Corregida (verificación visual pendiente) |

### 13.2 Estado de verificación visual

- **Landing `/conoce-clubs`:** verificada en navegador (Playwright/Chromium) a 320/375/390/425/768/1440 px en tema oscuro y claro: sin desbordes horizontales, montaje fuera del layout (sin navbar del sistema, nav inferior ni splash), barra propia, chips en una línea sin deslizar desde 320 px, carrusel móvil y grid + «Mostrar más» con orden intercalado (D-C-T), panel hero con identidad y 4 experiencias, fallback de imagen rota (un solo request a la URL fallida), **orden de secciones hero → qué es un club → propuestas → encuesta → MFI → acerca**, CTA de encuesta accesible pronto en móvil, sección MFI en una columna en móvil, animaciones reveal con `prefers-reduced-motion` respetado (0 clases, `opacity: 1`, `scroll-behavior: auto`), anclas y foco operativos, sin errores de consola nuevos (solo el 404 simulado del mock de prueba). Queda pendiente una pasada de contraste con herramienta especializada y la prueba end-to-end con el backend vivo de Render (500 intermitente, fuera de este repositorio).
- Contraste real de `text-slate-400` sobre `#0b111e` en cuerpos largos (fuera de landing): no auditado con herramienta.
- Tabulación completa en `/encuesta/:slug`: no auditada en esta iteración.
- **Iteración hero fotográfico + banda de actividades (código, sin navegador):** cambios implementados y verificados con ESLint + `vite build`; **no** se ejecutó verificación visual (sin Playwright en la sesión): queda pendiente revisar a 320/375/425/768/1440 px el recorte del hero, la integración móvil del contenido sobre la foto, la **rejilla de 3 columnas justificada** de pósteres en `md+` y la fila con scroll en móvil, el **equilibrio texto/imagen de los pósteres a 320 px** (copy ≤ 4 líneas, `line-clamp-4` sin activarse), **los 6 valores MFI siempre en grid 3×2 con pills `w-full` de fondo grande (2 por línea solo a 320–374 px)**, el chip «Actividades» (5 chips a 320 px), los **botones de Acerca alineados al fondo con la tarjeta de Gustavo Gallegos en escritorio** (junto al texto en móvil) y el copy de Misiones (borrador) e InterUNID (experiencia documentada). Recursos: fotos de Misiones, Trineo **e InterUNID** disponibles; queda pendiente **la foto del hero** (`LANDING.hero.imagen` sigue en `null`).
- **Iteración imagen móvil del carrusel hero (código, sin navegador):** `url_imagen_movil` opcional por diapositiva (schema + migración aditiva no ejecutada + rutas + modal admin con `SubirImagen`/`onRemove` + `<picture>` en `Heroe`); verificado con 8 pruebas de ruta (pool simulado), ESLint y `vite build`. **Alcance:** aplica solo al carrusel de `/`; `/conoce-clubs` conserva su hero estático `LANDING.hero` (§9, §11.8) y no se modifica. **Pendiente:** aplicar la migración en la BD desplegada, subir una imagen móvil de prueba desde el panel, verificar en navegador el recorte `object-cover` móvil y la conmutación en `lg`, y validar la limpieza de Cloudinary al reemplazar/eliminar.
- **Iteración doble scroll de modales (código, sin navegador):** fix de `ModalBase` (panel solo marco; único div interno con `max-h-[85vh] overflow-y-auto overscroll-contain p-5 sm:p-8`; bloqueo de scroll del body con `useBloqueoScroll`) y `ModalActualizaciones` (`innerClassName=""`, hijo `h-full` en vez de `h-[85vh]`, sin borde propio duplicado). **Alcance:** las 15 llamadas a `ModalBase` pasan de padding doble (32/64 px) a uno solo (20/32 px); los modales de capa única (`ModalConfirmacion`, `ModalidadClub`, `ModalVP`, etc.) no se modifican. `ModalActualizaciones` es el único que usa `panelClassName`/`innerClassName`. **Pendiente:** verificación visual en navegador de los modales abiertos en móvil y escritorio (una sola barra de scroll, sin desbordes, X de `externalClose` sin recorte, bloqueo del fondo).
- **Iteración hero móvil del catálogo (código + navegador headless, revisión visual humana pendiente):** `Heroe.jsx` pasa en `< lg` de banner a sangre a carrusel de tarjetas verticales (86vw, 3:4, snap, degradado inferior con título/subtítulo/CTA HTML, indicadores debajo con target 24×24 px); escritorio sin cambios. **Verificado con CDP (Edge headless) a 320/375/390/425/768/1440 px:** sin desborde horizontal (0 ofensores), aspecto exacto 0.750, 86 % de ancho de viewport (tablets con tope 440 px), peek de la tarjeta siguiente 13–30 px, `gap` 8 px, títulos/subtítulos sin truncar (`line-clamp` inactivo), CTA dentro de la tarjeta sin solape con el texto, imagen cargada y cubriendo la tarjeta (`url_imagen_movil` → fallback a `url_imagen` verificado con una slide sin móvil), indicadores debajo de la tarjeta, splash oculto; interacción: clic en indicador ↔ scroll sincronizado (ambas direcciones), CTA con offset `NAVBAR_HEIGHT` (delta 1 px), autoplay 8 s avanzando pista e indicador, vuelto automática última→primera; desktop 1440×900: banner `max-height: 55vh` (495 px), 2 flechas y carrusel móvil oculto. Capturas en `%TEMP%\opencode\hero-movil\*.png` (popup de noticias cerrado antes de cada captura). **Pendiente:** revisión visual humana de las capturas. **Hallazgo de entorno (fuera de alcance de código):** la BD local no tenía la columna `url_imagen_movil` (migración aplicada localmente) ni diapositivas (sembradas 3 de prueba); el frontend no tenía `.env.local`, por lo que `API_BASE` apuntaba a Render (`clubsunid-develop.onrender.com`) que devuelve `[]` → hero vacío también en despliegue.

### 13.3 Reglas de mantenimiento

1. **Antes de crear un componente de UI nuevo:** revisar `src/components/ui` y los pares de color de `ThemeContext`.
2. **Cambios de color global:** actualizar `ThemeContext` y grep de hex duplicados; no parchear solo una pantalla.
3. **Animaciones nuevas:** incluir `@media (prefers-reduced-motion: reduce)` como ya hacen encuesta y CTA de interés.
4. **Imágenes:** pasar por `obtenerUrlImagen`; respetar recomendación del hero 1920×800.
5. **Landing:** el copy editable vive en `src/config/landing.js`; no hardcodear el slug de la encuesta en componentes.
6. **Documentar aquí** cualquier regla visual nueva verificada; marcar **Propuesta** lo que aún no se implemente.

---

## 14. Editor de encuestas (panel de administración)

Pantalla del admin para crear y editar una encuesta (`src/components/admin/seccion-encuestas/`). Rediseñada con principios de interacción de Google Forms, conservando la identidad visual de Clubs UNID.

### 14.1 Barra contextual (Verificado en navegador)

| Elemento | Regla |
|----------|-------|
| Ubicación | Dentro del área del editor, encima de las pestañas. La navbar global y el menú lateral del panel no cambian. |
| Izquierda | «Volver a las encuestas», nombre de la encuesta (se recorta con `truncate`) y badge de estado. |
| Derecha | Vista previa · Compartir · Guardar · acción principal. |
| Acento | Sólo la acción principal usa el ámbar de `BotonAccion` (`bg-amber-400`); las demás van en `outline`. |
| Acción principal | Se adapta al estado real: `Publicar` (borrador), `Cerrar encuesta` (publicada), `Reabrir encuesta` (cerrada). Nunca queda un «Publicar» activo cuando no corresponde. |
| Guardar | Se llama «Guardar borrador» en borrador y «Guardar cambios» en los demás estados. |
| Estado del guardado | Texto explícito: «Tienes cambios sin guardar» / «Guardando…» / «Guardado» / el error. «Guardado» sólo aparece tras la confirmación del backend. |
| Móvil | Las acciones pasan a su propia fila (`basis-full`); Vista previa y Compartir se agrupan en el menú «Más» (`MenuAcciones`). Sin desbordes a 320 px. |

### 14.2 El editor es su propio contenedor de scroll (Verificado)

`position: sticky` **no funciona** dentro de `<main class="overflow-auto">` del panel: `main` es un contenedor de scroll que nunca se desplaza, así que un hijo `sticky` se va con la página. Comprobado con CDP: la barra pasó de `top: 152` a `top: -448` al hacer scroll.

Por eso el editor se monta como un panel de alto propio (`SeccionEncuestas.jsx`):

- La barra y las pestañas son **partes fijas** del panel (no `sticky`): nunca tapan contenido, errores ni controles enfocados. La barra lleva `shrink-0` para que el reparto de alturas no la aplaste.
- El contenido de la pestaña se recorre en el div con `flex-1 min-h-0 overflow-y-auto overscroll-contain`: es el **único** contenedor con scroll vertical del editor. `min-h-0` es lo que permite que esa zona se encoja dentro de la columna flex (sin él, el tamaño mínimo automático sería su contenido y el panel se saldría de su caja en vez de quedarse con scroll propio). `overscroll-contain` evita que al llegar al final el desplazamiento se encadene a la ventana.
- El alto se calcula, no se fija: `100dvh` menos el espacio que queda entre el borde superior del panel y el final de la ventana, menos el hueco de la navegación inferior en móvil. Se recalcula con un `ResizeObserver` sobre `document.body`, porque el aviso de éxito del panel aparece por encima y desplaza el editor. El suelo es pequeño (140 px) a propósito: con un suelo alto, en una ventana baja el panel se saldría de la pantalla y su parte final quedaría inalcanzable.
- **No se bloquea el scroll global.** La ventana puede desplazarse (el espacio que deja el panel del admin por debajo) sin que eso arrastre la barra, porque el contenedor del contenido usa `overscroll-contain`.

Medido (CDP, `scrollHeight` vs `clientHeight`):

| Elemento | 1440×900 | 390×844 | 320×640 |
|-----------|----------|----------|----------|
| Barra de acciones | 57 / 57 | 90 / 90 | 129 / 129 |
| Pestañas (`tablist`) | 32 / 32 | 32 / 32 | 32 / 32 |
| Panel del editor | 714 / 714 | 564 / 564 | 332 / 332 |
| Contenido de la pestaña | 622 / 622 (cabe) | 439 / 761 | 168 / 788 |

> **Scroll global del panel padre (preexistente, no del editor):** el documento mide 72 px más que la ventana en escritorio (972 vs 900) y 124 px en móvil. La causa está en el contenedor del panel de administración, no en el editor: la raíz reserva `pt-[var(--navbar-height)]` (72 px) para la navbar fija y la fila del panel usa `min-h-screen` (900 px), así que siempre sobra ese trozo. Es el mismo comportamiento en el dashboard y en las demás secciones, y no se tocó por mantener el alcance en el editor.

### 14.3 Pestañas: la línea de la fila (Verificado)

El truco clásico para que la pestaña activa tape la línea de la fila (`border-b-2` en el botón + `-mb-px`) hace que el botón se pinte 1 px por debajo de la caja del contenedor. Sin barra vertical visible, pero en cuanto el contenedor lleva `overflow-x-auto` (el scroll horizontal del móvil) ese 1 px se convierte en **una barra vertical de 1 px al lado de las pestañas**.

Solución: la línea es un elemento absoluto (`absolute bottom-0` con `border-b` del tema) y los botones son `relative z-10`. Así el desbordamiento vertical es cero (el `scrollHeight` del `tablist` iguala a su `clientHeight`), el scroll horizontal sigue funcionando y el subrayado ámbar de la pestaña activa sigue tapando la línea gris.

### 14.4 Pestañas y estado del formulario (Verificado)

| Pestaña | Contenido |
|---------|-----------|
| Preguntas | Título y descripción editables al principio, barra de herramientas con el contador (`N/60`) y «Agregar pregunta», y el listado. |
| Resultados | Sin cambios respecto a la versión anterior (`PanelResults`). |
| Configuración | Mensaje de agradecimiento y ventana de vigencia (apertura y cierre). |

- **El estado de la encuesta no se cambia en Configuración.** Todas las transiciones pasan por la barra contextual: `Publicar` (borrador), `Cerrar encuesta` (publicada), `Reabrir encuesta` (cerrada) y `Volver a borrador` (menú «Más»). El selector de estado que estaba en Configuración se retiró: duplicaba las acciones de la barra y daba dos caminos para cambiar lo mismo, con el riesgo de que mostrara un estado que el servidor todavía no había confirmado. Lo que sólo ofrecía ese selector —volver a borrador— quedó como acción secundaria del menú «Más», con confirmación. El distintivo de estado sigue junto al nombre de la encuesta y **sólo cambia cuando el servidor confirma** el cambio.
- El formulario (título, descripción, agradecimiento, fechas) vive **en el hook** (`useSeccionEncuestas`), no en un componente: es la única fuente de estado y por eso cambiar de pestaña no borra lo escrito.
- El modal de pregunta también vive en el hook, para que siga abierto al cambiar de pestaña.
- Al guardar una pregunta, el foco va al botón de editar de esa pregunta y el desplazamiento se aplica al contenedor del editor (`utils/scroll.js`), no a la ventana.

### 14.5 Edición de preguntas dentro del listado (Verificado)

Las preguntas ya no se editan en un modal: se editan **en su propia tarjeta**.

| Elemento | Comportamiento |
|----------|---------------|
| «Agregar pregunta» | Inserta una tarjeta editable **al final** del listado, enfoca el texto de la pregunta y la revela desplazando lo justo (por debajo de la barra de herramientas fija). |
| Editar una existente | Expande su propia tarjeta; las demás siguen mostrando su resumen y sus acciones (editar, duplicar, reordenar ↑↓, eliminar). |
| Sólo una en edición | El estado de la edición vive en el hook (`modoEdicion`, `preguntaEnEdicionId`), no en el componente: cambiar de pestaña no pierde lo escrito. |
| Acciones | **Añadir pregunta** (nueva), **Aplicar cambios** (edición) y **Cancelar** (descarta sólo esa edición; si era nueva y sin confirmar, desaparece del listado). |
| Ayuda opcional | Va en un desplegable («Añadir texto de ayuda»): casi ninguna pregunta la lleva y abierta siempre añade ruido a la tarjeta. |
| Tipos, opciones, escala y límites | Sin cambios: se reutiliza el formulario que estaba en el modal (`FormularioPregunta.jsx`, extraído de `ModalPreguntaEncuesta.jsx`, que se eliminó al quedarse sin consumidores). |

**Pendiente ≠ tarjeta abierta.** Abrir una pregunta sin tocarla no marca «cambios sin guardar» ni provoca ninguna petición: el hook guarda una copia del borrador tal como se abrió (`formPreguntaOriginal`) y la compara con lo escrito (`borradorModificado`). Sólo una tarjeta con contenido cuenta como pendiente (`edicionPendiente`).

**Nada se pierde en silencio.** Si una acción exige cerrar la edición en curso (duplicar o eliminar desde la propia tarjeta), se pide confirmación con tres salidas: *Aplicar cambios*, *Descartar* y *Seguir editando la anterior*. Cambiar de pestaña conserva la edición (vive en el hook) y al volver la tarjeta sigue expandida.

**Guardar y publicar resuelven primero la edición.** La barra llama a `aplicarEdicion()` antes de tocar los metadatos: si la pregunta se guarda pero la encuesta falla después, la pregunta ya está en el servidor, la encuesta no dice «Guardado» y **reintentar no crea una segunda copia** (la edición se cierra al guardarse la pregunta, no al guardarse la encuesta).

### 14.6 Distribución de la tarjeta (Verificado)

| Parte | Escritorio | Móvil |
|-------|-----------|--------|
| Cabecera | El texto de la pregunta a la izquierda, con el espacio principal, y el selector de tipo a la derecha, **alineado con el campo** (mismo `inputCls` ⇒ misma altura y tipografía). | El campo de texto primero y el selector debajo, dentro del ancho disponible. |
| Cuerpo | Los campos del tipo elegido y el desplegable de ayuda. | Igual, en una columna. |
| Franja inferior | Separada con una línea discreta (`border-t`): **Duplicar**, **Eliminar** y el control **Obligatoria**. | Igual, repartida en varias filas. |

- El selector de tipo se renderiza con el `inputCls` del tema (no con el `selectCls` del kit, que es más bajo): así el `select` queda a la misma altura que el campo de texto.
- La franja de utilidades la pinta la **tarjeta** (no el formulario), porque esas acciones son de la tarjeta. **Duplicar** y **Eliminar** necesitan un identificador que una pregunta nueva todavía no tiene: no se ofrecen en ella (se descarta con «Cancelar»); el control de «Obligatoria» sí está siempre.
- Los botones de la franja miden 40×40 px, llevan `aria-label` y anillo de foco visible.
- **Cancelar** y **Añadir pregunta / Aplicar cambios** quedan como acciones explícitas, con texto, en su propia fila y distinguibles de las utilidades.

### 14.7 Un solo acceso para agregar preguntas (Verificado)

- El botón de la barra fija se retiró: el contador y la nota se quedan, el acceso no.
- Queda **un** «Agregar pregunta» **al final del listado** (también en el estado vacío), con borde discontinuo, deshabilitado en el límite de 60 opciones y **visible sólo cuando no hay ninguna tarjeta en edición**.
- Mientras se edita, las demás tarjetas se quedan sólo con su resumen (sin flechas ni iconos): hay una sola acción a la vista y no hay dos sitios donde pulsar.

### 14.8 Opción especial «Otro: especifica» (Verificado)

| Capa | Decisión |
|------|----------|
| Modelo | `opciones_pregunta.es_otro BOOLEAN NOT NULL DEFAULT false` + índice parcial único `uq_opcion_otro ON opciones_pregunta (id_pregunta) WHERE es_otro` (como máximo una por pregunta). `detalle_respuestas.texto_otro TEXT` para el texto libre, con `CHECK (<= 200)`. |
| Identificación | Por la **propiedad** `es_otro`, nunca por la etiqueta: una opción normal escrita a mano como «Otro» es otra cosa. |
| Texto guardado | «Otro» (en español). La fila del editor muestra «Otro:» y una línea ilustrativa. |
| SQL | `schema.sql` lleva las columnas (en el `CREATE TABLE` y como `ALTER` idempotente, para que se apliquen también en bases ya creadas) y `backend/migrations/migrate-encuestas-otro.sql` es el paso manual para entornos donde `schema.sql` no se vuelve a ejecutar. El runner (`migrate.js`) aplica `schema.sql` en cada arranque. |
| Editor | Sólo en opción única y opción múltiple. «Añadir respuesta «Otro»» añade la fila especial **al final**; las opciones normales nuevas se insertan **antes** que ella; la acción desaparece mientras exista y vuelve si se elimina. El texto se edita en línea y los círculos/casillas del editor son **decorativos** (no son controles ni reciben foco). |
| Alumno | Al marcar «Otro» aparece un campo «Especifica tu respuesta» (máx. 200). Sin marcarlo, el campo no se pinta y su texto no se envía. En opción múltiple puede convivir con opciones normales. |
| Servidor | Exige texto no vacío (tras recortar) si «Otro» está marcada, rechaza el texto si esa opción no está marcada, y `texto_otro` se guarda **sólo** en la fila de la opción especial. |
| Resultados | «Otro» cuenta como una opción más en la gráfica (su conteo es el de siempre) y sus textos se listan aparte, sin crear una categoría por texto. |
| Compatibilidad | Las preguntas sin «Otro» se comportan exactamente igual que antes: `es_otro` vale false y `texto_otro` es NULL. El `CHECK` de «un valor por fila» no se toca. |

### 14.9 Scrollbar del área de contenido y marco exterior (Verificado)

La zona de contenido del editor (`flex-1 min-h-0 overflow-y-auto overscroll-contain`) usa la barra de scroll del sistema:

| Tema | Clase | Por qué |
|------|-------|---------|
| Oscuro | `scrollbar-dark` | Es la clase que el proyecto ya usa en los paneles sobre fondo azul noche (`ModalActualizaciones`): pulgar slate-700 y pista oscura. |
| Claro | `scrollbar-amber` | La que usa el kit de modales en ambos temas (`ModalBase`, `ModalConfirmacion`): pulgar ámbar y pista transparente. |

No hay CSS nuevo ni reglas globales: son las dos clases que ya existían en `src/index.css`. La barra **no se oculta** y el scroll de rueda, arrastre, teclado y táctil sigue siendo el del navegador. La barra de acciones y las pestañas quedan fuera del scroll, y ninguna tarjeta crea una zona de scroll propia (las opciones crecen y las recorre la zona de contenido).

**El contenedor del editor no lleva `border`.** El marco exterior salía de la utilidad `border` (1 px `solid`) con el color heredado: el preflight de Tailwind deja `border-color` en `currentColor` y el panel hereda el color de texto del panel, así que en tema oscuro quedaba una línea clara rodeando la barra, las pestañas y el contenido. Se retira esa clase y nothing más: los bordes internos (barra de acciones, barra de herramientas, tarjetas, campos y botones) y el anillo ámbar de la tarjeta en edición se conservan.

La barra de herramientas de la lista es `sticky` con `top: -1rem` en escritorio: el negativo compensa el relleno de la zona de contenido, para que el contenido no se transparente por esa banda mientras la barra está fija.

### 14.10 Guardado, publicación y vista previa (Verificado)

- **Publicar** guarda y publica en un solo `PUT` con `estado: 'publicada'`. Si el guardado falla, no se publica y el formulario queda intacto para reintentar.
- Publicar sin preguntas, con el título vacío o con fechas invertidas se explica con un mensaje accesible y un enlace «Ir a lo que falta» que lleva al control correspondiente.
- **Vista previa**: reutiliza `CampoPregunta` y el render del formulario público; refleja el estado actual del editor, guardado o no; **se puede marcar una opción y escribir en «Otro»** (estado local del propio modal) y el aviso dice que nada se registra. No hay botón de envío ni peticiones a `/publico/` (verificado en el registro de la prueba).
- **Compartir**: agrupa enlace, copiar y QR. Muestra el estado real del enlace (`En borrador`, `Programada`, `Abierta`, `Cerrada`) y si se puede responder en ese momento (`utils/encuesta.js` → `estadoEnlaceEncuesta`).

### 14.11 Pendiente de revisión

La verificación fue automatizada (DOM, estilos y comportamiento con CDP sobre las rutas de encuestas interceptadas en el navegador) y con capturas en claro y oscuro a 320/390/1440 px, más una ventana baja (1440×600) y las pestañas ampliadas ×3. La persistencia de «Otro» se comprobó aparte, contra el backend real y la base local. Falta la revisión visual humana de esas capturas.

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
