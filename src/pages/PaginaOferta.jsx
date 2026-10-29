import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

const ACTIVIDADES = [
  {
    titulo: 'Trineo de los Sueños',
    texto: 'Integración con valores de solidaridad y amor al prójimo en comunidad.',
    imagen: '/trineo-sueños1.jpg',
  },
  {
    titulo: 'InterUNID',
    texto: 'Experiencia documentada de UNID: deporte, arte y convivencia entre campus.',
    imagen: '/InterUNID.jpeg',
  },
];

export default function PaginaOferta() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />
      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] font-black text-amber-400 mb-4">
            Oferta
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[0.92] text-balance max-w-4xl">
            Actividades Clubs UNID
          </h1>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed max-w-2xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Descubre actividades y experiencias en las que puedes participar y conectar con la comunidad UNID.
          </p>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto grid gap-4 sm:grid-cols-2">
          {ACTIVIDADES.map((actividad) => (
            <article
              key={actividad.titulo}
              className="group relative min-h-[260px] overflow-hidden rounded-[2rem]"
            >
              <img
                src={actividad.imagen}
                alt={actividad.titulo}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/55 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
                <h2 className="text-2xl font-black">{actividad.titulo}</h2>
                <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-xs">
                  {actividad.texto}
                </p>
              </div>
            </article>
          ))}

          <div className={`rounded-[2rem] border border-dashed p-6 sm:p-8 flex flex-col justify-center ${oscuro ? 'border-slate-700/60 bg-[#0e162c]/40' : 'border-slate-300 bg-slate-100'}`}>
            <h3 className="text-xl font-black">Más actividades</h3>
            <p className={`mt-3 text-sm leading-relaxed ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
              Estructura preparada para integrar nuevas actividades del campus.
            </p>
          </div>
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
