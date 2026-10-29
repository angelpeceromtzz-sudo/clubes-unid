import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';
import { Icono } from '../components/ui/Icono';
import { LANDING } from '../config/landing';

const CONTENEDOR = 'w-full px-6 sm:px-8 lg:px-12 xl:px-16';

const LOGROS = [
  {
    titulo: 'Torneos ganados',
    texto: 'Participacion y triunfos en competencias deportivas y academicas.',
  },
  {
    titulo: 'Apoyo a comunidades',
    texto: 'Proyectos de servicio, vinculacion y impacto social.',
  },
  {
    titulo: 'Innovacion estudiantil',
    texto: 'Desarrollo de ideas, prototipos y soluciones tecnologicas.',
  },
  {
    titulo: 'Comunidad UNID',
    texto: 'Experiencias que fortalecen la pertenencia y el crecimiento personal.',
  },
];

export default function PaginaExperienciaEstudiantil() {
  const { tema, modoOscuro } = useTheme();
  const oscuro = modoOscuro;
  const kickerColor = modoOscuro ? 'text-amber-400' : 'text-amber-600';
  const panelBase = modoOscuro
    ? 'bg-[#0e162c] border-slate-700/60'
    : 'bg-white border-slate-200 shadow-sm';

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />
      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] font-black text-amber-400 mb-4">
            Experiencia estudiantil
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[0.92] text-balance max-w-4xl">
            Triunfos y experiencias que dejan huella
          </h1>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            UNID ha construido una historia de participacion, logros y servicio a traves de sus estudiantes y comunidades.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto grid gap-4 sm:grid-cols-2">
          {LOGROS.map((logro) => (
            <article
              key={logro.titulo}
              className={`rounded-3xl border p-6 sm:p-8 ${oscuro ? 'bg-[#0e162c] border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <h2 className="text-2xl font-black">{logro.titulo}</h2>
              <p className={`mt-3 text-sm sm:text-base leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                {logro.texto}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pb-16">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/campus"
            className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-amber-400 text-[#0e162c] font-black text-base shadow-2xl shadow-amber-400/20 hover:bg-amber-300 transition"
          >
            Explorar campus
          </Link>
        </div>
      </section>

      {/* E. Modelo de FormaciÃ³n Integral (VIVE): contexto de formaciÃ³n tras
          el acceso a la encuesta. El panel reutiliza el eco visual del hero
          para no introducir un lenguaje nuevo. */}
      <section aria-labelledby="titulo-mfi">
        <div className={`${CONTENEDOR} py-12 sm:py-16`}>
          <div className="max-w-6xl mx-auto">
            <div
              data-reveal
              className={`relative rounded-2xl border overflow-hidden p-4 sm:p-8 lg:p-9 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.10),transparent_65%)] ${panelBase}`}
            >
              <div className="max-w-2xl">
                <p className={`text-[11px] sm:text-xs uppercase tracking-[0.25em] font-black ${kickerColor}`}>
                  {LANDING.mfi.kicker}
                </p>
                <h2
                  id="titulo-mfi"
                  className={`mt-2 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-balance ${tema.title}`}
                >
                  {LANDING.mfi.titulo}
                </h2>
                <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
                  {LANDING.mfi.intro}
                </p>
              </div>

              <div className="mt-6 sm:mt-5">
                <p className={`text-xs uppercase tracking-[0.2em] font-bold ${tema.subtitle}`}>
                  {LANDING.mfi.valoresTitulo}
                </p>
                {/* Siempre como en mÃ³vil M: 3 por lÃ­nea (2 filas) desde
                    375 px; a 320â€“374 px caen a 2 (Â«SolidaridadÂ» no cabe 3
                    veces). Desde xl (â‰¥1280) los 6 caben en una sola fila a
                    todo el ancho del panel. Pills con fondo grande (w-full
                    llenando la celda + py-2/2.5) y acotados a max-w-2xl en
                    escritorio para que queden equilibrados dentro del panel. */}
                <ul className="mt-3 grid grid-cols-2 min-[375px]:grid-cols-3 gap-2 sm:gap-2.5 sm:mt-2.5 max-w-2xl xl:grid-cols-6 xl:max-w-none">
                  {LANDING.mfi.valores.map((valor) => (
                    <li
                      key={valor}
                      className={`inline-flex w-full items-center justify-center gap-1 sm:gap-1.5 rounded-full border px-1 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold tracking-tight sm:tracking-normal ${
                        modoOscuro
                          ? 'border-slate-600/60 text-slate-300'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {valor}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="mt-8 sm:mt-7 grid gap-x-6 gap-y-7 sm:gap-y-6 sm:grid-cols-3">
                {LANDING.mfi.dimensiones.map((dim) => (
                  <li key={dim.titulo} className="flex items-start gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${
                        modoOscuro
                          ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
                          : 'bg-amber-100 border-amber-200 text-amber-700'
                      }`}
                    >
                      <Icono nombre={dim.icono} strokeWidth={2} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-black uppercase tracking-wider ${tema.title}`}>
                        {dim.titulo}
                      </h3>
                      <p className={`mt-1 text-sm leading-relaxed ${tema.subtitle}`}>{dim.texto}</p>
                      {/* Separador Ã¡mbar (solo mÃ³vil), igual que en Â«QuÃ© es
                          un clubÂ»: al apilarse, la lÃ­nea fina evita la
                          lectura de Â«tablaÂ». */}
                      <span aria-hidden="true" className="mt-3 block h-px bg-amber-400/40 sm:hidden" />
                    </div>
                  </li>
                ))}
              </ul>

              <p
                className={`mt-8 sm:mt-7 max-w-xl border-l-2 border-amber-400/70 pl-4 text-sm sm:text-base font-medium leading-relaxed ${tema.subtitle}`}
              >
                {LANDING.mfi.puente}
              </p>
            </div>
          </div>
        </div>
      </section>


      <PiePagina />
    </main>
  );
}
