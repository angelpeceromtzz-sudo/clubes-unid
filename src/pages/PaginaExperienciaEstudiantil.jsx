import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

const LOGROS = [
  {
    titulo: 'Torneos ganados',
    texto: 'Participación y triunfos en competencias deportivas y académicas.',
  },
  {
    titulo: 'Apoyo a comunidades',
    texto: 'Proyectos de servicio, vinculación y impacto social.',
  },
  {
    titulo: 'Innovación estudiantil',
    texto: 'Desarrollo de ideas, prototipos y soluciones tecnológicas.',
  },
  {
    titulo: 'Comunidad UNID',
    texto: 'Experiencias que fortalecen la pertenencia y el crecimiento personal.',
  },
];

export default function PaginaExperienciaEstudiantil() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

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
            UNID ha construido una historia de participación, logros y servicio a través de sus estudiantes y comunidades.
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

      <PiePagina />
    </main>
  );
}
