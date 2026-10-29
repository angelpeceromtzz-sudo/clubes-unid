/* Página pública /acerca-del-proyecto — origen del proyecto, equipo de
   desarrollo, personas que contribuyen y forma de trabajar de Clubs UNID.
   Se monta fuera del layout del sistema junto con la landing (ver App.jsx),
   con su propia barra (identidad + retorno a la landing) y el mismo
   lenguaje visual. El copy vive en src/config/acerca.js; los campos en null
   (rol, aportación, frase, foto) no se muestran: sin textos «pendiente» ni
   perfiles ficticios. Sin fotografía autorizada se usa una silueta ámbar
   del mismo diámetro que la foto; mostrarFoto es la autorización explícita
   (tener la foto no significa publicarla). La encuesta vive en la landing;
   esta página solo ofrece el retorno a ella. */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Icono } from '../components/ui/Icono';
import { Logotipo } from '../components/layout/barra-navegacion/Logotipo';
import { ACERCA } from '../config/acerca';
import { BotonBarraPublica } from '../components/landing/BotonBarraPublica';

const CONTENEDOR = 'w-full px-6 sm:px-8 lg:px-12 xl:px-16';
const FOCO_PRIMARIO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e162c] focus-visible:ring-offset-2 focus-visible:ring-offset-amber-400';

// Textos por párrafos: cada entrada de la configuración se pinta en su <p>.
function Parrafos({ items, clases }) {
  return items.map((texto, i) => (
    <p key={texto.slice(0, 24)} className={i > 0 ? `mt-3 ${clases}` : clases}>
      {texto}
    </p>
  ));
}

// Perfil centrado sin bordes pesados: foto (o silueta ámbar provisional),
// frase opcional con protagonismo tipográfico, nombre, cargo/rol, aportación
// y, en el equipo, los roles de trabajo como línea discreta (no como
// etiquetas saturadas ni logros). Cada campo en null/ausente se omite sin
// dejar huecos artificiales.
//
// Filas equivalentes: el perfil es un grid que comparte con sus hermanas
// las pistas de la fila (subgrid desde sm) en este orden: 1) foto/avatar,
// 2) frase, 3) nombre, 4) cargo, 5) descripción y 6) roles. Los perfiles de
// una misma fila quedan alineados (nombres a la misma altura, cargo con el
// espacio del más alto, descripciones y roles que arrancan donde termina la
// zona compartida de cada pista). Cuando el perfil queda en una fila propia
// (móvil, o el suelto de una fila de dos), el subgrid no aplica y el
// contenido toma su altura natural, sin espacio reservado.
function PerfilPersona({ persona }) {
  const { tema, modoOscuro } = useTheme();
  if (persona.visible === false) return null;

  const conFoto = Boolean(persona.foto && persona.mostrarFoto);
  const nombreColor = modoOscuro ? 'text-white' : 'text-slate-900';
  const fraseColor = modoOscuro ? 'text-slate-200' : 'text-slate-700';

  return (
    <li className="grid sm:row-span-6 sm:grid-rows-subgrid w-full lg:col-span-2 justify-items-center text-center px-4 py-6 min-w-0 gap-y-2.5">
      <div className="row-start-1">
        {conFoto ? (
          <img
            src={persona.foto}
            alt={`Foto de ${persona.nombre}`}
            loading="lazy"
            className="shrink-0 w-24 h-24 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={`shrink-0 w-24 h-24 rounded-full flex items-center justify-center ${
              modoOscuro ? 'bg-amber-400/10 text-amber-400/80' : 'bg-amber-100 text-amber-500'
            }`}
          >
            <Icono nombre="profile" strokeWidth={1.5} className="h-10 w-10" />
          </span>
        )}
      </div>

      {persona.frase && (
        <blockquote className={`row-start-2 max-w-[28ch] text-lg sm:text-xl font-semibold italic leading-snug ${fraseColor}`}>
          <span aria-hidden="true" className="not-italic text-amber-500">“</span>
          {persona.frase}
          <span aria-hidden="true" className="not-italic text-amber-500">”</span>
        </blockquote>
      )}

      <p className={`row-start-3 font-black text-base sm:text-lg ${nombreColor}`}>{persona.nombre}</p>
      {persona.rol && (
        <p
          className={`row-start-4 text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] ${
            modoOscuro ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          {persona.rol}
        </p>
      )}
      {persona.aportacion && (
        <p className={`row-start-5 text-sm leading-relaxed max-w-[36ch] ${tema.subtitle}`}>{persona.aportacion}</p>
      )}
      {persona.roles?.length > 0 && (
        <p
          className={`row-start-6 text-[11px] leading-relaxed max-w-[38ch] ${
            modoOscuro ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {persona.roles.join(' · ')}
        </p>
      )}
    </li>
  );
}

// Cuadrícula compartida por equipo y colaboradores. Grid de 1/2/3 columnas
// (móvil / tableta / escritorio) con 6 pistas explícitas que los perfiles
// referencian por subgrid (desde sm); el espacio entre pistas es uniforme
// (gap-y) para no depender de márgenes individuales. En escritorio las
// columnas son 6 de media anchura (cada perfil ocupa col-span-2: mismo ancho
// que una tercera parte antes) y las filas incompletas se centran con reglas
// de layout por posición, no por nombre: una última fila de dos arranca en
// la columna 2 y una de sola arranca en la 3. En móvil/tableta el flujo
// sigue siendo 1 y 2 columnas; el perfil suelto de una fila de dos conserva
// su altura natural.
function CuadriculaPerfiles({ personas }) {
  return (
    <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 grid-rows-[auto_auto_auto_auto_auto_auto] gap-x-6 gap-y-2.5 lg:[&>li:nth-child(3n+1):nth-last-child(2)]:col-start-2 lg:[&>li:nth-child(3n+1):last-child]:col-start-3">
      {personas.map((persona) => (
        <PerfilPersona key={persona.nombre} persona={persona} />
      ))}
    </ul>
  );
}

// Subtítulo de grupo dentro de "Personas que contribuyen". Centrado con
// filete ámbar y tamaño de subtítulo para distinguirlo de la línea de rol
// (micro-texto mayúscula) de cada perfil.
function TituloGrupo({ id, children }) {
  const { modoOscuro } = useTheme();
  return (
    <h3 id={id} className="text-center">
      <span
        className={`inline-block border-l-4 border-amber-400 pl-3 sm:pl-4 text-base sm:text-lg font-black ${
          modoOscuro ? 'text-white' : 'text-slate-900'
        }`}
      >
        {children}
      </span>
    </h3>
  );
}

export default function PaginaAcercaProyecto() {
  const { tema, modoOscuro } = useTheme();

  // Aparición suave de las secciones editoriales, una sola vez. Mismo patrón
  // que la landing (.landing-reveal en index.css): sin IntersectionObserver
  // o con prefers-reduced-motion, el contenido queda visible sin animación.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const elementos = document.querySelectorAll('[data-reveal]');
    if (elementos.length === 0) return undefined;
    elementos.forEach((el) => el.classList.add('landing-reveal'));
    const observer = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('landing-reveal--visible');
          observer.unobserve(entrada.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const kickerColor = modoOscuro ? 'text-amber-400' : 'text-amber-600';
  const tituloSeccion = `text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${tema.title}`;
  const bandaSuave = modoOscuro ? 'bg-[#0e162c]' : 'bg-white';
  const textoParrafos = `text-sm sm:text-base leading-relaxed ${tema.subtitle}`;
  const estiloVolver = `inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-amber-400 text-[#0e162c] font-black text-sm transition duration-200 hover:bg-amber-300 active:scale-[0.98] ${FOCO_PRIMARIO}`;
  // El retorno de la barra superior usa el botón secundario compartido
  // (BotonBarraPublica), el mismo que el chip Conócenos de la landing:
  // así ambos miden lo mismo (~38px en móvil, 44px desde sm; mismo
  // padding, tipografía, radio y estados) sin que el ancho deje de
  // ajustarse al contenido.

  return (
    <main className={`pb-10 lg:pb-20 ${tema.bg} ${tema.text}`}>
      {/* Barra propia: identidad (vuelve a la landing) y retorno explícito. */}
      <div className={CONTENEDOR}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 py-4">
          <Link
            to="/campus/campeche"
            aria-label="Ir a la landing de Clubs UNID"
            className="flex items-center shrink-0"
          >
            <Logotipo />
          </Link>
          <BotonBarraPublica to="/campus/campeche">
            <Icono nombre="arrow-left" strokeWidth={2} className="h-3.5 w-3.5 shrink-0" />
            {ACERCA.cierre.btnVolver}
          </BotonBarraPublica>
        </div>
      </div>

      {/* Presentación: kicker, título e invitación. La encuesta no se ofrece
          aquí; el acceso principal a la encuesta permanece en la landing. */}
      <section aria-labelledby="titulo-acerca" className="scroll-mt-8">
        <div className={`${CONTENEDOR} pt-6 sm:pt-10 pb-10 sm:pb-14`}>
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl">
              <p className={`text-[11px] sm:text-xs uppercase tracking-[0.25em] font-black ${kickerColor}`}>
                {ACERCA.kicker}
              </p>
              <h1
                id="titulo-acerca"
                className={`mt-2 text-[1.75rem] leading-[1.15] sm:text-4xl lg:text-5xl font-black tracking-tight text-balance ${tema.title}`}
              >
                {ACERCA.nombre}
              </h1>
              <p className={`mt-4 text-base sm:text-lg leading-relaxed ${tema.subtitle}`}>{ACERCA.intro}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo nació: composición editorial de dos columnas — relato con
          frase destacada y apoyo visual (fotografía opcional + hitos). */}
      <section
        id="como-nacio"
        aria-labelledby="titulo-como-nacio"
        className={`scroll-mt-8 ${bandaSuave}`}
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div
            className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:items-stretch"
            data-reveal
          >
            <div className="max-w-2xl">
              <h2 id="titulo-como-nacio" className={tituloSeccion}>
                {ACERCA.comoNacio.titulo}
              </h2>
              <p
                className={`mt-5 text-xl sm:text-2xl font-black leading-snug border-l-4 border-amber-400 pl-4 sm:pl-5 ${tema.title}`}
              >
                {ACERCA.comoNacio.destacado}
              </p>
              <div className="mt-5">
                <Parrafos items={ACERCA.comoNacio.texto} clases={textoParrafos} />
              </div>
            </div>
            {/* En lg la columna derecha iguala la altura del bloque de
                texto: la foto se estira (object-cover) y los hitos quedan
                alineados a la base. En móvil conserva aspect-[3/4]. */}
            <div className="lg:flex lg:flex-col">
              {/* w-full + lg:max-w-none: en el contexto flex de la columna,
                  mx-auto solo centraría con ancho de contenido (la leyenda),
                  no al ancho de la columna. */}
              <figure className="mx-auto w-full max-w-[20rem] lg:max-w-none lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
                {/* img absoluta: no aporta altura intrínseca, así la fila
                    la define el texto y la foto se estira a ese alto. */}
                <div
                  className={`relative overflow-hidden rounded-2xl aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-0 ${
                    modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-100'
                  }`}
                >
                  <img
                    src={ACERCA.comoNacio.imagen.src}
                    alt={ACERCA.comoNacio.imagen.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <figcaption className={`mt-2 text-xs ${tema.subtitle}`}>
                  {ACERCA.comoNacio.imagen.leyenda}
                </figcaption>
              </figure>
              <ol className="mt-6 space-y-3">
                {ACERCA.comoNacio.hitos.map((hito, i) => (
                  <li key={hito} className="flex items-baseline gap-3">
                    <span className={`text-sm font-black tabular-nums ${kickerColor}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-sm font-bold ${tema.title}`}>{hito}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Para quién lo construimos: los estudiantes como protagonistas
          (fotografía + declaración) y el apoyo en paneles secundarios. */}
      <section id="para-quien" aria-labelledby="titulo-para-quien" className="scroll-mt-8">
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto" data-reveal>
            <h2 id="titulo-para-quien" className={tituloSeccion}>
              {ACERCA.paraQuien.titulo}
            </h2>
            {/* En lg la foto protagonista se estira al alto del bloque de
                declaración (object-cover); el texto queda centrado a la
                derecha. min-h evita que la fila quede demasiado baja y la
                foto, una tira fina. En móvil conserva aspect-[3/4]. */}
            <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-14 lg:items-stretch lg:min-h-[24rem]">
              <figure className="mx-auto w-full max-w-[20rem] lg:max-w-none lg:flex lg:flex-col lg:min-h-0">
                {/* img absoluta: la fila la define el texto, no el intrinsic
                    de la foto vertical. */}
                <div
                  className={`relative overflow-hidden rounded-2xl aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-0 ${
                    modoOscuro ? 'bg-[#0b111e]' : 'bg-slate-100'
                  }`}
                >
                  <img
                    src={ACERCA.paraQuien.imagen.src}
                    alt={ACERCA.paraQuien.imagen.alt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <figcaption className={`mt-2 text-xs ${tema.subtitle}`}>
                  {ACERCA.paraQuien.imagen.leyenda}
                </figcaption>
              </figure>
              <div className="lg:self-center">
                <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${tema.title}`}>
                  <span className="border-b-4 border-amber-400 pb-1">{ACERCA.paraQuien.protagonista}</span>
                </h3>
                <p className={`mt-5 max-w-xl text-base sm:text-lg leading-relaxed ${tema.subtitle}`}>
                  {ACERCA.paraQuien.texto[1]}
                </p>
              </div>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <div className={`rounded-2xl px-6 py-5 ${modoOscuro ? 'bg-white/[0.04]' : 'bg-slate-100/70'}`}>
                <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${kickerColor}`}>
                  {ACERCA.paraQuien.organizadoresTitulo}
                </h4>
                <p className={`mt-2.5 text-sm leading-relaxed ${tema.subtitle}`}>
                  {ACERCA.paraQuien.texto[0]}
                </p>
              </div>
              <div className={`rounded-2xl px-6 py-5 ${modoOscuro ? 'bg-white/[0.04]' : 'bg-slate-100/70'}`}>
                <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${kickerColor}`}>
                  {ACERCA.paraQuien.rectorTitulo}
                </h4>
                <p className={`mt-2.5 text-sm leading-relaxed ${tema.subtitle}`}>
                  {ACERCA.paraQuien.texto[2]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Equipo de desarrollo */}
      <section
        id="equipo"
        aria-labelledby="titulo-equipo"
        className={`scroll-mt-8 ${bandaSuave}`}
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto">
            <h2 id="titulo-equipo" className={tituloSeccion}>
              {ACERCA.equipo.titulo}
            </h2>
            <p className={`mt-3 max-w-2xl text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
              {ACERCA.equipo.intro}
            </p>
            <CuadriculaPerfiles personas={ACERCA.equipo.integrantes} />
          </div>
        </div>
      </section>

      {/* Personas que contribuyen: acompañamiento y colaboración */}
      <section
        id="contribuciones"
        aria-labelledby="titulo-contribuciones"
        className="scroll-mt-8"
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto">
            <h2 id="titulo-contribuciones" className={tituloSeccion}>
              {ACERCA.colaboradores.titulo}
            </h2>
            <p className={`mt-3 max-w-2xl text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
              {ACERCA.colaboradores.intro}
            </p>
            <div className="mt-12" role="group" aria-labelledby="grupo-acompanamiento">
              <TituloGrupo id="grupo-acompanamiento">Acompañamiento</TituloGrupo>
              <CuadriculaPerfiles personas={ACERCA.colaboradores.acompanamiento} />
            </div>
            <div className="mt-12" role="group" aria-labelledby="grupo-colaboracion">
              <TituloGrupo id="grupo-colaboracion">Colaboración</TituloGrupo>
              <CuadriculaPerfiles personas={ACERCA.colaboradores.colaboracion} />
            </div>
          </div>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section
        id="como-trabajamos"
        aria-labelledby="titulo-como-trabajamos"
        className={`scroll-mt-8 ${bandaSuave}`}
      >
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto">
            <h2 id="titulo-como-trabajamos" className={tituloSeccion}>
              {ACERCA.comoTrabajamos.titulo}
            </h2>
            <p className={`mt-3 max-w-2xl text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
              {ACERCA.comoTrabajamos.intro}
            </p>
            <ul className="mt-8 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {ACERCA.comoTrabajamos.pasos.map((paso) => (
                <li key={paso.titulo} className="flex items-start gap-4 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center ${
                      modoOscuro
                        ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                        : 'bg-amber-100 border-amber-200 text-amber-700'
                    }`}
                  >
                    <Icono nombre={paso.icono} strokeWidth={2} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${tema.title}`}>{paso.titulo}</h3>
                    <p className={`mt-1.5 text-sm leading-relaxed ${tema.subtitle}`}>{paso.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Cierre: invitación y retorno a la landing. */}
      <section aria-labelledby="titulo-cierre" className="scroll-mt-8">
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl">
              <h2 id="titulo-cierre" className={tituloSeccion}>
                {ACERCA.cierre.titulo}
              </h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>{ACERCA.cierre.texto}</p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <Link to="/campus/campeche" className={`${estiloVolver} w-full sm:w-auto`}>
                <Icono nombre="arrow-left" strokeWidth={2} className="h-4 w-4 shrink-0" />
                {ACERCA.cierre.btnVolver}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
