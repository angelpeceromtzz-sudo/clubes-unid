import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

export default function PaginaOferta() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white overflow-x-hidden' : 'bg-slate-50 text-slate-900 overflow-x-hidden'}>
      <BarraGeneral />

      <section className="relative min-h-[84vh] overflow-hidden flex items-center" aria-labelledby="hero-oferta">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/actividades/interunid.jpeg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b111e] via-[#0b111e]/88 to-[#0b111e]/45" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-transparent to-transparent" aria-hidden="true" />

        <div className="relative w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-20">
          <div className="max-w-3xl space-y-6">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-black text-amber-400">
              Actividad destacada
            </p>
            <h1 id="hero-oferta" className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.92] text-balance">
              InterUNID
            </h1>
            <p className="text-sm uppercase tracking-[0.25em] font-bold text-amber-300">
              Deporte · Arte · Convivencia entre campus
            </p>
            <p className={`text-base sm:text-lg leading-relaxed max-w-2xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              InterUNID reúne a la comunidad UNID en competencias deportivas y actividades artísticas que fomentan convivencia, disciplina, creatividad y trabajo en equipo.
            </p>
            <p className={`text-sm sm:text-base leading-relaxed max-w-2xl ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
              Incluye fútbol, voleibol, básquetbol, atletismo, tochito bandera, fotografía, dibujo y canto. Los torneos se desarrollan en distintas regiones y campus.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto">
          <div className={`rounded-[2rem] border border-dashed p-6 sm:p-8 ${oscuro ? 'border-slate-700/60 bg-[#0e162c]/40' : 'border-slate-300 bg-slate-100'}`}>
            <h2 className="text-2xl font-black">Más actividades</h2>
            <p className={`mt-3 text-sm leading-relaxed ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
              Estructura preparada para integrar nuevas actividades del campus.
            </p>
          </div>
        </div>
      </section>

      <PiePagina />
    </main>
  );
}
