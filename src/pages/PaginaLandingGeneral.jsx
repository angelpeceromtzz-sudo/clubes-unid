import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function PaginaLandingGeneral() {
  const { tema, modoOscuro } = useTheme();

  const fondo = modoOscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900';
  const superficie = modoOscuro ? 'bg-[#0e162c] border-slate-700/60' : 'bg-white border-slate-200 shadow-sm';
  const acento = modoOscuro ? 'text-amber-400' : 'text-amber-600';

  return (
    <main className={`min-h-screen ${fondo}`}>
      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className={`text-xs uppercase tracking-[0.25em] font-black ${acento}`}>
              Clubs UNID
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-balance">
              Comunidad, participación y crecimiento universitario
            </h1>
            <p className={`text-base sm:text-lg leading-relaxed max-w-xl ${tema.subtitle}`}>
              Una plataforma para descubrir y vivir experiencias extracurriculares en los campus UNID.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/campus"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-400 text-[#0e162c] font-black shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition"
              >
                Explorar campus
              </Link>
              <Link
                to="/conocenos"
                className={`inline-flex items-center justify-center px-6 py-3 rounded-full border font-black transition ${modoOscuro ? 'border-slate-600 hover:border-amber-400/60' : 'border-slate-300 hover:border-amber-500/60'}`}
              >
                Conócenos
              </Link>
            </div>
          </div>

          <div className={`rounded-2xl border p-6 sm:p-8 ${superficie}`}>
            <h2 className="text-xl font-black mb-4">Experiencias que impulsan tu desarrollo</h2>
            <ul className="grid grid-cols-2 gap-3">
              {['Deporte', 'Cultura', 'Tecnología', 'Comunidad'].map((item) => (
                <li
                  key={item}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold ${modoOscuro ? 'border-slate-700/60 bg-[#0b111e]/60' : 'border-slate-200 bg-slate-50'}`}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black mb-6">Campus disponibles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/campus/campeche"
              className={`rounded-2xl border p-6 transition hover:border-amber-400/60 ${superficie}`}
            >
              <h3 className="text-lg font-black">Campus Campeche</h3>
              <p className={`mt-2 text-sm ${tema.subtitle}`}>
                Clubes, noticias, calendario y portal estudiantil.
              </p>
              <span className={`mt-4 inline-block text-sm font-bold ${acento}`}>Entrar →</span>
            </Link>
            <div className={`rounded-2xl border p-6 border-dashed ${superficie}`}>
              <h3 className="text-lg font-black">Próximamente</h3>
              <p className={`mt-2 text-sm ${tema.subtitle}`}>
                Nuevos campus se integrarán a la plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
