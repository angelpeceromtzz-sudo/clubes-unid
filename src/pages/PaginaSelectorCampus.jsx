import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

export default function PaginaSelectorCampus() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white overflow-x-hidden' : 'bg-slate-50 text-slate-900 overflow-x-hidden'}>
      <BarraGeneral />

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] font-black text-amber-400 mb-4">
            Campus
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.92] text-balance max-w-4xl">
            Encuentra tu comunidad.
          </h1>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Explora Clubs UNID desde el campus donde estudias y descubre experiencias fuera del aula.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pb-6 sm:pb-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/campus/campeche"
            className="group relative block overflow-hidden rounded-[2rem] border border-slate-700/60 min-h-[520px]"
          >
            <img
              src="/campus/unid-campeche.jpeg"
              alt="Campus Campeche"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-4xl font-black">Campus Campeche</h2>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[11px] sm:text-base text-slate-200 max-w-md">
                  Clubes, noticias, calendario y portal estudiantil.
                </p>
                <span className="text-sm font-black text-amber-400">
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Explorar Campus Campeche</span>
                </span>
              </div>
            </div>
          </Link>

          <p className={`mt-6 text-sm leading-relaxed ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Una visión que puede crecer. Clubs UNID está pensado para expandirse cuando llegue el momento adecuado.
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Clubs UNID es una iniciativa estudiantil desarrollada inicialmente para Campus Campeche, con visión de crecimiento.
          </p>
        </div>
      </section>
      <PiePagina />
    </main>
  );
}
