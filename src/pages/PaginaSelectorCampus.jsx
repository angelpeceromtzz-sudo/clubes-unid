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

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/campus/campeche"
            className="group relative block overflow-hidden rounded-[2rem] border border-slate-700/60 min-h-[420px]"
          >
            <img
              src="/campus/unid-campeche.jpeg"
              alt="Campus Campeche"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <h2 className="text-3xl sm:text-4xl font-black">Campus Campeche</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-md">
                Clubes, noticias, calendario y portal estudiantil.
              </p>
              <span className="mt-5 inline-flex items-center justify-center px-5 py-3 rounded-full bg-amber-400 text-[#0e162c] font-black text-sm shadow-lg shadow-amber-400/20 group-hover:bg-amber-300 transition">
                Explorar Campus Campeche
              </span>
            </div>
          </Link>

          <p className={`mt-6 text-sm leading-relaxed ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Una visión que puede crecer. Clubs UNID está pensado para expandirse cuando llegue el momento adecuado.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <p className={`text-sm leading-relaxed ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Clubs UNID es una iniciativa estudiantil desarrollada inicialmente para Campus Campeche, con visión de crecimiento.
          </p>
        </div>
      </section>
      <PiePagina />
    </main>
  );
}
