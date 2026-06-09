# Documentación Técnica — Clubes UNID

**Plataforma de Gestión de Inscripciones a Actividades Extracurriculares**

---

## 1. Resumen Ejecutivo

**Clubes UNID** es una aplicación web de tipo *Single Page Application* (SPA) desarrollada para la Universidad Interamericana para el Desarrollo (UNID). Su propósito principal es centralizar y optimizar el proceso de inscripción de los estudiantes a los clubes y actividades extracurriculares que ofrece la institución. A través de una interfaz moderna, responsiva e intuitiva, los alumnos pueden explorar un catálogo organizado de clubes —deportivos, culturales y tecnológicos—, consultar información detallada de cada uno (costo, cupo disponible, descripción) e inscribirse en tiempo real. La plataforma resuelve los problemas de desinformación y procesos manuales de inscripción, proporcionando una experiencia digital ágil que fomenta la participación estudiantil y fortalece el sentido de pertenencia a la comunidad universitaria.

---

## 2. Descripción del Proyecto

El sistema se estructura en torno a cuatro funcionalidades principales:

| Funcionalidad | Descripción |
|---|---|
| **Catálogo de Clubes por Categorías** | Visualización en tarjetas (*grid responsivo*) de todos los clubes disponibles, cada una con imagen, descripción, categoría, costo mensual y número de lugares ocupados vs. totales. |
| **Filtros Interactivos de Navegación** | Barra de filtros tipo *pill* en el Navbar que permite segmentar el catálogo en "Todos", "Deportes", "Cultura" y "Tecnología". El filtro activo se resalta visualmente. |
| **Perfil de Alumno en Navbar** | Indicadores de notificaciones y mensajes, avatar con inicial del usuario, nombre visible y menú desplegable con opciones de configuración (alternar modo oscuro, ayuda, impresión, idioma, cierre de sesión). |
| **Banner Hero de Bienvenida** | Carrusel horizontal a pantalla completa (full-width) con imágenes de alta calidad, superposición de gradiente oscuro y texto institucional en tipografía itálica. Incluye flechas de navegación sutiles y autoplay cada 8 segundos. |

Además, la aplicación cuenta con un sistema de inscripción en vivo: al inscribirse a un club, se actualiza el contador de cupo disponible y el club aparece en la sección "Mis Clubes Inscritos", desde donde el alumno puede darse de baja si lo desea.

---

## 3. Stack Tecnológico

| Tecnología | Versión | Propósito en el Proyecto |
|---|---|---|
| **React** | ^19.2.6 | Biblioteca principal para la construcción de la interfaz de usuario basada en componentes funcionales y hooks (useState, useEffect, useRef). |
| **Vite** | ^8.0.12 | *Bundler* y servidor de desarrollo ultrarrápido que proporciona *Hot Module Replacement* (HMR) y compilación optimizada para producción. |
| **Tailwind CSS** | ^4.3.0 | Framework de estilos utilitario que permite maquetar completamente con clases predefinidas, garantizando diseño responsivo *mobile-first* y consistencia visual. |
| **PostCSS** | ^8.5.15 | Herramienta de transformación de CSS utilizada internamente por Tailwind CSS v4 para el procesado de estilos. |
| **ESLint** | ^10.3.0 | Linter para garantizar calidad y consistencia en el código JavaScript/JSX. |

**Criterios de selección:** React se eligió por su eficiencia en SPAs gracias al Virtual DOM y la reutilización de componentes. Vite se prefirió sobre Create React App por su velocidad de arranque y empaquetado nativo con ESModules. Tailwind CSS v4 se integró con su plugin nativo de Vite, eliminando la necesidad de archivos de configuración extensos y proporcionando un flujo de trabajo puramente basado en clases en el marcado.

---

## 4. Arquitectura del Sistema

### 4.1 Flujo de Información

El componente raíz `App.jsx` actúa como el orquestador principal del estado global de la aplicación. La jerarquía de componentes y el flujo de datos es el siguiente:

```
App (Estado Global)
├── Navbar
│   ├── Recibe: categoriaActiva, setCategoriaActiva, modoOscuro,
│   │            setModoOscuro, menuAbierto, setMenuAbierto, tema
│   └── Renderiza: logo UNID, filtros por categoría, iconos de
│                   notificaciones/correo, avatar de perfil con menú
│
├── Hero
│   ├── Estado interno: slideActual (useState), temporizadorRef (useRef)
│   ├── Autocontenido: no recibe props del padre
│   └── Renderiza: carrusel full-width con 4 slides, flechas de
│                   navegación, autoplay de 8s
│
└── main (max-w-7xl)
    ├── Sección "Mis Clubes Inscritos" (condicional)
    │   └── ClubCard (esInscrito=true, onDarDeBaja)
    │
    ├── Encabezado "Explorar Clubes Disponibles"
    │
    └── ClubCard × N (grid 1→2→3 columnas)
        └── Recibe: nombre, descripcion, precio, categoria,
                     cupoMaximo, cupoActual, imagen, onInscribir, modoOscuro
```

### 4.2 Gestión de Estado

El estado central se maneja exclusivamente con hooks nativos de React:

- **`clubes`** (`useState`): Arreglo mutable de objetos que representa el catálogo completo. Se modifica al inscribir (`cupoActual++`) o dar de baja (`cupoActual--`).
- **`misClubes`** (`useState`): Arreglo de clubes a los que el alumno está inscrito. Se actualiza por referencia al inscribir (agregar) o dar de baja (filtrar).
- **`categoriaActiva`** (`useState`): Controla qué filtro está seleccionado en el Navbar. Los clubes se filtran en tiempo de renderizado (`clubesFiltrados`).
- **`modoOscuro`** (`useState`): Alterna entre dos objetos de tema (`tema`) que contienen clases Tailwind para modo oscuro y claro.
- **`menuAbierto`** (`useState`): Controla la visibilidad del menú desplegable del perfil.

No se utiliza ninguna librería externa de gestión de estado (Redux, Zustand, etc.), ya que la complejidad del estado es baja y los props se pasan directamente a los componentes hijos.

### 4.3 Sistema de Temas (Modo Oscuro/Claro)

El objeto `tema` se reconstruye en cada renderizado según el valor de `modoOscuro`. Contiene clases para: fondo general, color de texto, fondo del header, borde, títulos, subtítulos, estilos del pill de navegación, botones activos e inactivos, menú desplegable y colores de iconos. Cada componente consume las propiedades que necesita (`tema.bg`, `tema.title`, etc.).

---

## 5. Componentes Clave Desarrollados

### 5.1 Navbar / Header (`Navbar.jsx`)

Componente de barra superior *sticky* con desenfoque de fondo (`backdrop-blur-md`). Funcionalidades:

- **Logotipo UNID** con etiqueta "Clubs" en estilo *badge* ambar.
- **Navegación por categorías**: Píldora horizontal con 4 botones que alternan clase activa/inactiva según `categoriaActiva`. Transiciones suaves y efecto `active:scale-95`.
- **Iconos de notificaciones y correo**: SVG inline con efecto hover a color ambar.
- **Perfil de usuario**: Muestra el nombre "Ángel Antonio Pecero M." (visible en `sm:`), avatar circular con la inicial "A" y un chevron que rota 180° al abrir el menú.
- **Menú desplegable**: Dropdown con opciones de alternar modo oscuro, ayuda, imprimir página, idioma (Español) y cerrar sesión. Incluye overlay de cierre al hacer clic fuera.

### 5.2 Hero Slider / Carrusel de Pantalla Completa (`Hero.jsx`)

Componente de banner institucional diseñado como carrusel horizontal *full-width* (edge-to-edge). Detalles técnicos:

| Aspecto | Implementación |
|---|---|
| **Contenedor** | `section.w-full > div.group.relative.w-full.overflow-hidden` con altura responsiva: `h-[280px]` (móvil) → `h-[350px]` → `h-[420px]` → `h-[480px]` (escritorio). |
| **Transición entre slides** | Los slides se posicionan de forma absoluta (`absolute inset-0`) y alternan entre `opacity-100` y `opacity-0 pointer-events-none` con `transition-all duration-700 ease-in-out`. |
| **Imágenes de fondo** | Cada slide carga su imagen mediante `style={{ backgroundImage }}` en un div con `bg-cover bg-center bg-no-repeat`, evitando distorsiones. |
| **Capa de superposición** | Gradiente oscuro direccional (`bg-gradient-to-l` o `bg-gradient-to-r`) que garantiza la legibilidad del texto independientemente de la imagen de fondo. |
| **Texto institucional** | Título "¡ÚNETE A LOS LOBOS ROJOS!" en `font-extrabold italic uppercase` con "LOBOS ROJOS" en amarillo `#FBBF24`. Subtítulo "DESCUBRE TUS PASIONES. IMPULSA TU FUTURO." en `text-gray-200 font-medium tracking-wide`. Ambos alineados a izquierda o derecha según la dirección del gradiente. |
| **Botón CTA** | "Explorar Clubes" con fondo amarillo, animación `hover:scale-105` y flecha SVG animada (`group-hover:translate-x-1`). |

**Autoplay y limpieza de memoria:**

El intervalo de cambio automático se gestiona mediante `useEffect` y `useRef`:

```javascript
const temporizadorRef = useRef(null);

useEffect(() => {
  temporizadorRef.current = setInterval(() => {
    setSlideActual((prev) => (prev + 1) % SLIDES.length);
  }, 8000);
  return () => clearInterval(temporizadorRef.current);
}, []);
```

Cada interacción manual (clic en flecha izquierda o derecha) ejecuta `reiniciarTemporizador()`, que limpia el intervalo actual con `clearInterval` y crea uno nuevo, evitando que el slide cambie abruptamente justo después de la interacción del usuario.

**Controles de navegación:**

- **Flechas**: Dos botones absolutos posicionados en `left-4 md:left-6` y `right-4 md:right-6`, centrados verticalmente (`top-1/2 -translate-y-1/2`, `z-20`). Opacidad inicial 0, aumentan a 100 al hacer hover sobre el contenedor (`group-hover:opacity-100`) con `transition-opacity duration-300`. Estilo sutil: `bg-black/20`, `backdrop-blur-sm`, borde `border-white/10`, y hover que aclara el fondo (`hover:bg-white/20`).
- **Indicadores de paginación**: No implementados (eliminados intencionalmente para mantener un diseño minimalista).

**Slides configurados:**

| # | Imagen | Gradiente | Alineación | Logro |
|---|---|---|---|---|
| 1 | Cancha de fútbol con estudiantes (lobo rojo) | `to-l from-black/90...` | Derecha | Bienvenidos a la manada |
| 2 | Escenario cultural | `to-r from-black/90...` | Izquierda | Gala Cultural |
| 3 | Exposición de arte | `to-l from-black/90...` | Derecha | Exposición Anual de Artes Plásticas |
| 4 | Torneo de esports | `to-r from-black/90...` | Izquierda | Torneo Nacional de Esports 2025 |

### 5.3 Catálogo de Clubes Disponibles (`ClubCard.jsx`)

Componente de tarjeta independiente que representa un club. Recibe todas sus propiedades mediante props y se adapta al modo oscuro/claro a través del prop `modoOscuro`.

- **Estructura visual**: `rounded-2xl`, sombra (`shadow-lg` → `shadow-2xl` en hover), borde, imagen con `object-cover` y zoom al hover (`group-hover:scale-105`).
- **Información mostrada**:
  - *Badge* de categoría (Deportes, Cultura, Tecnología).
  - Nombre del club (cambia a color ambar en hover).
  - Descripción (limitada a 3 líneas con `line-clamp-3`).
  - Costo mensual: valor numérico o etiqueta "Gratis" en ambar.
  - Lugares disponibles: `cupoActual / cupoMaximo`.
  - Botón de acción contextual:
    - **Inscribirse**: Cuando hay cupo disponible. Cambia a estilo ambar en hover.
    - **Cupo Lleno**: Deshabilitado con opacidad reducida cuando se alcanza el máximo.
    - **Dar de baja**: Estilo rojo, visible solo si el alumno ya está inscrito.
- **Inscripción en vivo**: Al hacer clic en "Inscribirse", se actualiza el estado global `clubes` (incrementando `cupoActual`) y se agrega el club a `misClubes`, lo que provoca que aparezca en la sección superior "Mis Clubes Inscritos".

---

## 6. Gestión de Diseño y Estilos

### 6.1 Enfoque Mobile-First con Tailwind CSS

Todas las rutas de diseño siguen la convención *mobile-first* de Tailwind. Los breakpoints utilizados son:

| Breakpoint | Prefijo | Aplicación |
|---|---|---|
| Por defecto (móvil) | — | `grid-cols-1`, `h-[280px]`, `text-3xl`, `px-6` |
| ≥640px | `sm:` | `grid-cols-2`, `h-[350px]`, `text-4xl` |
| ≥768px | `md:` | `h-[420px]`, `text-5xl`, `px-16` |
| ≥1024px | `lg:` | `grid-cols-3`, `h-[480px]`, `text-6xl`, `px-24` |

### 6.2 Evolución del Diseño del Hero

El componente Hero experimentó varias iteraciones de diseño:

1. **Versión inicial**: Dos columnas independientes (texto CTA a la izquierda, carrusel de tarjetas a la derecha) con fondo degradado oscuro de pantalla completa.
2. **Segunda versión**: Carrusel flotante con `rounded-2xl` y `shadow-lg` dentro de un contenedor centrado, permitiendo que el fondo claro de la aplicación se viera alrededor.
3. **Versión actual**: Carrusel **full-width** (edge-to-edge) que ocupa todo el ancho de la pantalla, sin bordes redondeados exteriores ni márgenes laterales. Se integra armoniosamente con el fondo oscuro general (`bg-[#0b111e]`) de la aplicación sin romper la estética del Navbar.

### 6.3 Armonía entre Modo Oscuro y Claro

El Navbar se adapta automáticamente al tema activo: en modo oscuro el header usa `bg-[#0b111e]/80` con borde `border-slate-800/60`; en modo claro usa `bg-white/80` con borde `border-slate-200`. El Hero, al ser un banner institucional, mantiene su esquema oscuro independientemente del tema activo, creando un contraste visual que separa la sección de bienvenida del catálogo inferior.

### 6.4 Tipografía y Paleta de Colores

- **Tipografía principal**: Sistema `font-sans` de Tailwind (configuración por defecto del navegador), con variantes `font-black`, `font-extrabold`, `font-bold` y `font-medium`.
- **Colores institucionales**:
  - `#0b111e` / `#0e162c` / `#121a33`: Fondos oscuros.
  - `#FBBF24` (amber-400): Color de acento principal (botones, badges, enlaces).
  - `#F59E0B` (amber-500): Variante hover.
  - `#EF4444` (red-500): Acciones destructivas (dar de baja).
  - `#FBBF24` con `text-transparent bg-clip-text`: Resaltado del texto "LOBOS ROJOS".

---

## 7. Créditos y Autoría

| Dato | Información |
|---|---|
| **Nombre del Autor** | Ángel Antonio Pecero Martínez |
| **Institución** | Universidad Interamericana para el Desarrollo (UNID) |
| **Plataforma** | SPA — Clubes UNID (Gestión de Inscripciones Extracurriculares) |
| **Stack Tecnológico** | React 19 + Vite 8 + Tailwind CSS 4 |
| **Versión del Documento** | v1.1.0 |
| **Fecha de Elaboración** | Junio 2026 |

---

*Documentación generada conforme al estándar de portafolio de evidencias de la UNID. Para cualquier actualización o corrección, dirigirse al autor.*

---

## 8. Historial de Versiones

### v1.1.0 — Reestructuración de Navegación y Eliminación del Sistema de Inscripción Local

#### 8.1 Descripción del Cambio / Componente Reestructurado

- **Propósito:** Migrar la plataforma de un modelo de inscripción local con estado (`misClubes`) a un modelo de exploración y visualización de detalle (SPA), eliminando la complejidad de la gestión de inscripciones dentro de la misma aplicación. Se rediseñó el Navbar con la imagen institucional del Lobo Rojo y se convirtieron las tarjetas del catálogo en elementos cliqueables que navegan a una vista de detalle del club.
- **Funcionalidades Afectadas o Nuevas:**
  - Navbar: Nuevo logotipo con SVG del Lobo Rojo (Red Wolf) en color ambar institucional, texto "UNID" en negrita y subtítulo "CAMPUS DE CLUBES LOBOS ROJOS" en tracking espaciado.
  - ClubCard: Eliminación completa de los botones "Inscribirse", "Dar de baja" y "Cupo Lleno". La tarjeta ahora es completamente cliqueable (`cursor-pointer`, `active:scale-[0.98]`), ejecutando `onClick` al presionarla. Padding ajustado de `p-5` a `p-6` para mejor respiración visual.
  - App.jsx: Eliminación del estado `misClubes`, las funciones `manejarInscripcion` y `darDeBaja`, y la sección "Mis Clubes Inscritos". Nuevo estado `clubSeleccionado` que controla el renderizado condicional entre el catálogo general y una vista de detalle (`VistaDetalle`) con imagen expandida, descripción completa, costo y disponibilidad, más un botón "Volver al catálogo".
  - Hero.jsx: Eliminación de la función no utilizada `irAlSlide` (legado de los dots de paginación).

#### 8.2 Stack Tecnológico y Dependencias Utilizadas

- **Core:** React 19.2.6, Vite 8.0.12, Tailwind CSS 4.3.0
- **Dependencias adicionales:** Ninguna. Todo el manejo de estado y navegación se implementó con hooks nativos de React (`useState`). No se incorporaron librerías externas de enrutamiento (react-router-dom) ni de iconografía (lucide-react, react-icons); los íconos se implementaron con SVG inline.

#### 8.3 Arquitectura del Componente e Integración de Estado

- **Flujo y Estado Local:**
  - `clubSeleccionado` (`useState`, inicializado como `null`): Almacena el objeto del club que el usuario selecciona. Cuando tiene un valor, el renderizado principal cambia condicionalmente para mostrar el componente `VistaDetalle` en lugar del `Hero` y el catálogo.
  - `setClubSeleccionado(null)`: Se ejecuta desde el botón "Volver al catálogo" en `VistaDetalle`, restaurando la vista principal.
  - La eliminación de `misClubes`, `manejarInscripcion` y `darDeBaja` simplifica el estado global al eliminar la lógica de mutación de `cupoActual` y el seguimiento de inscripciones del alumno.
- **Manejo de Layout con CSS (Tailwind):**
  - Navbar: `flex items-center gap-3` para alinear el SVG del lobo (`.h-10.w-10`) con el bloque de texto. El texto usa `text-[9px] sm:text-[10px]` responsivo con `tracking-widest` para el subtítulo institucional.
  - ClubCard: `p-6` (antes `p-5`), `cursor-pointer active:scale-[0.98]` para feedback táctil, `h-px my-5` (antes `my-4`) para separación equilibrada. Todo el contenido informativo (imagen, badge, título, descripción, costo y lugares) se conserva sin botones de acción.
  - VistaDetalle: Contenedor `max-w-4xl mx-auto px-6 py-12` con tarjeta `rounded-2xl shadow-2xl border border-slate-700/50 bg-[#0e162c]`. Imagen en `h-64 md:h-80`. Botón "Volver" con icono SVG de flecha y efecto `group-hover:-translate-x-1`.

#### 8.4 Versión e Historial de Control

- **Autoría y Firma:** Ángel Antonio Pecero Martínez
- **Institución:** Universidad Interamericana para el Desarrollo (UNID)
- **Incremento de Versión:** v1.1.0
- **Cambios respecto a v1.0.0:**
  - Eliminación del sistema de inscripción local y la sección "Mis Clubes Inscritos".
  - Rediseño del Navbar con la imagen del Lobo Rojo y el texto "UNID CAMPUS DE CLUBES LOBOS ROJOS".
  - Migración de ClubCard a un modelo de tarjeta informativa cliqueable sin botones de acción.
  - Implementación de navegación SPA condicional con vista de detalle para cada club.
  - Limpieza de código: eliminación de la función `irAlSlide` no utilizada en Hero.jsx.
