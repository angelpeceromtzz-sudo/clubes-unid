import { ClubCard } from './components/ClubCard'; // Importamos al hijo

const CLUBES_DATA = [
  {
    id: 1,
    nombre: "Selección de Voleibol Universitario",
    descripcion: "Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.",
    precio: 0
  },
  {
    id: 2,
    nombre: "Taller de Dibujo y Pintura Analítica",
    descripcion: "Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.",
    precio: 100 
  },
  {
    id: 3,
    nombre: "Brigada de Apoyo Comunitario",
    descripcion: "Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.",
    precio: 0
  },
  {
    id: 4,
    nombre: "Club de Basketball Halcones",
    descripcion: "Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.",
    precio: 0
  },
  {
    id: 5,
    nombre: "Torneo de Esports y Convivencia",
    descripcion: "Espacio recreativo para retas de videojuegos de peleas, deportes y estrategia, promoviendo el juego limpio.",
    precio: 50
  },
  {
    id: 6,
    nombre: "Taller de Música y Ensamble Acústico",
    descripcion: "Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.",
    precio: 120
  },
  {
    id: 7,
    nombre: "Club de Programación y Desarrollo de Software",
    descripcion: "Grupos de estudio prácticos sobre frameworks modernos, bases de datos y algoritmos competitivos.",
    precio: 0
  }
];

function App() {
  return (
    <div className="min-h-screen bg-[#0b111e] text-slate-200 font-sans">
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        <div className="mb-10">
          <h2 className="text-3xl font-black tracking-tight text-white">Explorar Clubes Disponibles</h2>
          <p className="text-slate-400 text-sm mt-1">Catálogo oficial UNID</p>
        </div>

        {/* El Padre recorre los datos y manda los props al hijo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CLUBES_DATA.map((club) => (
            <ClubCard 
              key={club.id}
              nombre={club.nombre}
              descripcion={club.descripcion}
              precio={club.precio}
            />
          ))}
        </div>

      </main>
    </div>
  );
}

export default App;