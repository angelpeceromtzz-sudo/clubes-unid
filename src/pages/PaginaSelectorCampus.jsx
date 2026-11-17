import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

const CAMPUS_POR_ESTADO = [
  { estado: 'Aguascalientes', campuses: ['Campus Aguascalientes'] },
  { estado: 'Baja California', campuses: ['Campus Ensenada', 'Campus Tijuana'] },
  { estado: 'Campeche', campuses: ['Campus Campeche', 'Campus Ciudad del Carmen'] },
  { estado: 'Chiapas', campuses: ['Campus Tapachula'] },
  { estado: 'Ciudad de México', campuses: ['Campus Ciudad de México'] },
  { estado: 'Coahuila', campuses: ['Campus Saltillo'] },
  { estado: 'Durango', campuses: ['Campus Durango', 'Campus Gómez Palacio'] },
  { estado: 'Estado de México', campuses: ['Campus Tejupilco', 'Campus Tlalnepantla'] },
  { estado: 'Guerrero', campuses: ['Campus Acapulco'] },
  { estado: 'Hidalgo', campuses: ['Campus Pachuca', 'Campus Tula'] },
  { estado: 'Jalisco', campuses: ['Campus Ocotlán', 'Campus Tepatitlán'] },
  { estado: 'Michoacán', campuses: ['Campus Cotija', 'Campus Uruapan', 'Campus Ocolusen', 'Campus Sahuayo'] },
  { estado: 'Nuevo León', campuses: ['Campus Monterrey'] },
  { estado: 'Oaxaca', campuses: ['Campus Juchitán', 'Campus Tuxtepec'] },
  { estado: 'Puebla', campuses: ['Campus Atlixco', 'Campus Tehuacán'] },
  { estado: 'Quintana Roo', campuses: ['Campus Cancún', 'Campus Playa del Carmen', 'Campus Chetumal', 'Campus Cozumel'] },
  { estado: 'San Luis Potosí', campuses: ['Campus San Luis Potosí'] },
  { estado: 'Sonora', campuses: ['Campus Hermosillo', 'Campus Ciudad Obregón'] },
  { estado: 'Tabasco', campuses: ['Campus Villahermosa'] },
  { estado: 'Tamaulipas', campuses: ['Campus Tampico'] },
  { estado: 'Veracruz', campuses: ['Campus Tuxpan'] },
  { estado: 'Yucatán', campuses: ['Campus Tizimín', 'Campus Mérida Vista Alegre'] },
  { estado: 'Zacatecas', campuses: ['Campus Zacatecas', 'Campus Fresnillo'] },
];

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
            <img draggable={false}
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

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] font-black text-amber-400 mb-3">
              Todos los campus
            </p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-balance">
              Conoce nuestra red de campus
            </h2>
            <p className={`mt-4 text-sm sm:text-base ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
              Campus Campeche es el único disponible por ahora. El resto se irán activando próximamente.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPUS_POR_ESTADO.map((grupo) => (
              <article
                key={grupo.estado}
                className={`rounded-3xl border p-5 sm:p-6 ${oscuro ? 'border-slate-700/60 bg-[#0e162c]/40' : 'border-slate-200 bg-white'}`}
              >
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-amber-400 mb-3">
                  {grupo.estado}
                </h3>
                <ul className="space-y-2">
                  {grupo.campuses.map((nombre) => {
                    const activo = nombre === 'Campus Campeche';
                    return (
                      <li key={nombre}>
                        {activo ? (
                          <Link
                            to="/campus/campeche"
                            className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition ${oscuro ? 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                          >
                            <span>{nombre}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Disponible</span>
                          </Link>
                        ) : (
                          <span
                            aria-disabled="true"
                            className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm font-medium cursor-not-allowed select-none ${oscuro ? 'bg-slate-800/60 text-slate-500' : 'bg-slate-100 text-slate-400'}`}
                          >
                            <span>{nombre}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Próximamente</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PiePagina />
    </main>
  );
}
