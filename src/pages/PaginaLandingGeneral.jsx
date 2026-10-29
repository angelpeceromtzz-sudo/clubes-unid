import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';

const EXPERIENCIAS = [
  {
    titulo: 'Deporte',
    texto: 'Actividad, competencia y trabajo en equipo.',
    imagen: '/trineo-sue%C3%B1os1.jpg',
  },
  {
    titulo: 'Cultura',
    texto: 'Arte, expresión y vida universitaria.',
    imagen: '/como-nacio.jpeg',
  },
  {
    titulo: 'Tecnología',
    texto: 'Proyectos, innovación y creatividad aplicada.',
    imagen: '/InterUNID.jpeg',
  },
  {
    titulo: 'Comunidad',
    texto: 'Encuentro, servicio y crecimiento personal.',
    imagen: '/misiones3.jpg',
  },
];

export default function PaginaLandingGeneral() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />

      <section
        className="relative min-h-[92vh] overflow-hidden flex items-center"
        aria-labelledby="hero-general"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/misiones3.jpg')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0b111e] via-[#0b111e]/90 to-[#0b111e]/70"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-transparent to-transparent"
          aria-hidden="true"
        />

        <div className="relative w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-20">
          <div className="max-w-3xl space-y-6">
            <p className="text-xs sm:text-sm uppercase tracking-[0.35em] font-black text-amber-400">
              Iniciativa estudiantil
            </p>
            <h1
              id="hero-general"
              className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.92] text-balance"
            >
              Tu universidad.
              <span className="block text-amber-400">Tus pasiones.</span>
              <span className="block">Tu comunidad.</span>
            </h1>
            <p className={`text-base sm:text-lg leading-relaxed max-w-xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              Un espacio para vivir experiencias fuera del aula y formar parte de la vida universitaria.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/campus"
                className="inline-flex items-center justify-center px-7 py-4 rounded-full bg-amber-400 text-[#0e162c] font-black text-base shadow-2xl shadow-amber-400/25 hover:bg-amber-300 transition"
              >
                Explorar campus
              </Link>
              <Link
                to="/conocenos"
                className={`inline-flex items-center justify-center px-7 py-4 rounded-full border font-black text-base transition ${oscuro ? 'border-slate-500 hover:border-amber-400/70' : 'border-slate-300 hover:border-amber-500/70'}`}
              >
                Conócenos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-[0.25em] font-black text-amber-400 mb-3">
              Experiencias
            </p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-balance">
              Encuentra lo que te mueve
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {EXPERIENCIAS.map((experiencia) => (
              <article
                key={experiencia.titulo}
                className="group relative min-h-[260px] overflow-hidden rounded-[2rem]"
              >
                <img
                  src={experiencia.imagen}
                  alt={experiencia.titulo}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/55 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
                  <h3 className="text-2xl font-black">{experiencia.titulo}</h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-xs">
                    {experiencia.texto}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] font-black text-amber-400 mb-3">
              Campus
            </p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-balance">
              Empieza por un campus
            </h2>
            <p className={`mt-4 text-base sm:text-lg leading-relaxed max-w-xl ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              Campus Campeche ya está activo dentro de Clubs UNID.
            </p>
          </div>

          <Link
            to="/campus/campeche"
            className="group relative block overflow-hidden rounded-[2rem] border border-slate-700/60"
          >
            <img
              src="/uriel.jpeg"
              alt="Campus Campeche"
              className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b111e] via-[#0b111e]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="text-2xl font-black">Campus Campeche</h3>
              <p className="mt-2 text-sm text-slate-200">
                Clubes, noticias, calendario y portal estudiantil.
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-amber-400">Entrar →</span>
                <span className={`text-xs ${oscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                  Una visión que puede crecer.
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="px-6 sm:px-8 lg:px-12 xl:px-16 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-balance">
            Tu próxima experiencia puede empezar aquí.
          </h2>
          <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Explora Campus Campeche y encuentra el espacio donde quieres participar.
          </p>
          <Link
            to="/campus/campeche"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-amber-400 text-[#0e162c] font-black text-base shadow-2xl shadow-amber-400/25 hover:bg-amber-300 transition"
          >
            Entrar a Campus Campeche
          </Link>
        </div>
      </section>
    </main>
  );
}
