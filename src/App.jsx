import { useState, useEffect } from 'react';
import { ClubCard } from './components/ClubCard';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';

const CLUBES_INICIALES = [
  {
    id: 1,
    nombre: "Equipo de Voleibol",
    descripcion: "Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.",
    precio: 0,
    categoria: "Deportes",
    cupoMaximo: 14,
    cupoActual: 9,
    imagen: "https://images.unsplash.com/photo-1553005746-9245ba190489?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    id: 2,
    nombre: "Taller de Dibujo y Pintura Analítica",
    descripcion: "Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.",
    precio: 100,
    categoria: "Cultura",
    cupoMaximo: 20,
    cupoActual: 15,
    imagen: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 3,
    nombre: "Brigada de Apoyo Comunitario",
    descripcion: "Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.",
    precio: 0,
    categoria: "Cultura",
    cupoMaximo: 40,
    cupoActual: 30,
    imagen: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    id: 4,
    nombre: "Equipo de Basketball",
    descripcion: "Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.",
    precio: 0,
    categoria: "Deportes",
    cupoMaximo: 30,
    cupoActual: 28,
    imagen: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 5,
    nombre: "Equipo de Esports y Gaming Competitivo",
    descripcion: "Torneo de videojuegos competitivos en modalidades de estrategia, acción y deportes.",
    precio: 50,
    categoria: "Tecnología",
    cupoMaximo: 25,
    cupoActual: 20,
    imagen: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 6,
    nombre: "Taller de Música y Ensamble Acústico",
    descripcion: "Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.",
    precio: 120,
    categoria: "Cultura",
    cupoMaximo: 20,
    cupoActual: 12,
    imagen: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 7,
    nombre: "Equipo de Atletismo",
    descripcion: "Entrenamientos de resistencia, velocidad y técnica de carrera. Participación en competencias locales y nacionales.",
    precio: 0,
    categoria: "Deportes",
    cupoMaximo: 30,
    cupoActual: 16,
    imagen: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 8,
    nombre: "Club de Boxeo",
    descripcion: "Sesiones de entrenamiento de boxeo, técnicas de defensa personal, acondicionamiento físico y preparación para competencias.",
    precio: 0,
    categoria: "Deportes",
    cupoMaximo: 20,
    cupoActual: 9,
    imagen: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: 9,
    nombre: "Club de literatura y escritura creativa",
    descripcion: "Espacio para amantes de la literatura, donde se realizan lecturas, análisis de obras y talleres de escritura creativa.",
    precio: 0,
    categoria: "Cultura",
    cupoMaximo: 20,
    cupoActual: 7,
    imagen: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop"
  },
    {
    id: 10,
    nombre: "Equipo de Porristas",
    descripcion: "Entrenamientos de coreografías, acrobacias y técnicas de animación para eventos deportivos y competencias de porristas.",
    precio: 0,
    categoria: "Cultura",
    cupoMaximo: 50,
    cupoActual: 39,
    imagen: "https://images.unsplash.com/photo-1589748239338-afe695e833d3?q=80&w=1026&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  }
];

function VistaDetalle({ club, onVolver, tema }) {
  const lleno = club.cupoActual >= club.cupoMaximo;
  const c = {
    card: tema.text === "text-slate-200"
      ? "bg-[#0e162c] border-slate-700/50"
      : "bg-white border-slate-200",
    title: tema.text === "text-slate-200" ? "text-white" : "text-slate-900",
    desc: tema.text === "text-slate-200" ? "text-slate-400" : "text-slate-600",
    divider: tema.text === "text-slate-200" ? "bg-slate-800" : "bg-slate-200",
    label: tema.text === "text-slate-200" ? "text-slate-500" : "text-slate-400",
    price: tema.text === "text-slate-200" ? "text-white" : "text-slate-900",
    lugares: tema.text === "text-slate-200" ? "text-slate-200" : "text-slate-600",
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button
        onClick={onVolver}
        className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors mb-8 cursor-pointer group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
        </svg>
        Volver al catálogo
      </button>

      <div className={`rounded-2xl overflow-hidden shadow-2xl border ${c.card}`}>
        <div className="h-64 md:h-80 overflow-hidden">
          <img
            src={club.imagen}
            alt={club.nombre}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              {club.categoria}
            </span>
          </div>
          <h1 className={`text-3xl md:text-4xl font-black mb-4 ${c.title}`}>
            {club.nombre}
          </h1>
          <p className={`text-base leading-relaxed mb-6 ${c.desc}`}>
            {club.descripcion}
          </p>
          <div className={`h-px mb-6 ${c.divider}`} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className={`text-[10px] uppercase tracking-wider font-bold block ${c.label}`}>
                Costo Mensual
              </span>
              <span className={`text-2xl font-black ${c.price}`}>
                {club.precio === 0 ? (
                  <span className="text-amber-400 uppercase text-sm tracking-wide">Gratis</span>
                ) : (
                  `$${club.precio} MXN`
                )}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-[10px] uppercase tracking-wider font-bold block ${c.label}`}>
                Lugares Disponibles
              </span>
              <span className={`text-lg font-black ${lleno ? 'text-red-400' : c.lugares}`}>
                {club.cupoActual} / {club.cupoMaximo}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [clubes] = useState(CLUBES_INICIALES);
  const [clubSeleccionado, setClubSeleccionado] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");
  const [modoOscuro, setModoOscuro] = useState(() => {
    const guardado = localStorage.getItem('theme');
    return guardado !== null ? guardado === 'dark' : true;
  });
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

  const clubesFiltrados =
    categoriaActiva === "Todos"
      ? clubes
      : clubes.filter((club) => club.categoria === categoriaActiva);

  const tema = modoOscuro
    ? {
        bg: "bg-[#0b111e]",
        text: "text-slate-200",
        headerBg: "bg-[#0b111e]/80",
        headerBorder: "border-slate-800/60",
        title: "text-white",
        subtitle: "text-slate-400",
        navPill: "bg-[#18223f]/60 border border-slate-800 rounded-full p-1",
        btnActive: "bg-amber-400 text-[#0e162c] font-black rounded-full",
        btnInactive: "bg-transparent text-slate-400 hover:text-white rounded-full",
        dropdownBg: "bg-[#0e162c]",
        dropdownBorder: "border-slate-700",
        dropdownItem: "hover:bg-slate-700/50",
        profileText: "text-slate-200",
        iconColor: "text-slate-400",
        logoText: "text-white",
      }
    : {
        bg: "bg-slate-50",
        text: "text-slate-800",
        headerBg: "bg-white/80",
        headerBorder: "border-slate-200",
        title: "text-slate-900",
        subtitle: "text-slate-500",
        navPill: "bg-slate-100 border border-slate-200 rounded-full p-1",
        btnActive: "bg-[#0e162c] text-white shadow-sm rounded-full",
        btnInactive: "bg-transparent text-slate-600 hover:text-slate-900 rounded-full",
        dropdownBg: "bg-white",
        dropdownBorder: "border-slate-200",
        dropdownItem: "hover:bg-slate-100",
        profileText: "text-slate-700",
        iconColor: "text-slate-500",
        logoText: "text-slate-900",
      };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${tema.bg} ${tema.text}`}>

      <Navbar
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        modoOscuro={modoOscuro}
        setModoOscuro={setModoOscuro}
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        tema={tema}
        onLogoClick={() => setClubSeleccionado(null)}
      />

      {clubSeleccionado ? (
        <VistaDetalle
          club={clubSeleccionado}
          onVolver={() => setClubSeleccionado(null)}
          tema={tema}
        />
      ) : (
        <>
          <Hero />

          <main className="max-w-7xl mx-auto px-6 py-12">

            <div className="mb-10">
              <h2 className={`text-3xl font-black tracking-tight transition-colors duration-300 ${tema.title}`}>Explorar Clubes Disponibles</h2>
              <p className={`text-sm mt-1 transition-colors duration-300 ${tema.subtitle}`}>Catálogo oficial UNID</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubesFiltrados.map((club) => (
                <ClubCard
                  key={club.id}
                  nombre={club.nombre}
                  descripcion={club.descripcion}
                  precio={club.precio}
                  categoria={club.categoria}
                  cupoMaximo={club.cupoMaximo}
                  cupoActual={club.cupoActual}
                  imagen={club.imagen}
                  onClick={() => setClubSeleccionado(club)}
                  modoOscuro={modoOscuro}
                />
              ))}
            </div>

          </main>
        </>
      )}
    </div>
  );
}

export default App;
