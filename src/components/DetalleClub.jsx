// Vista detallada de un club con información, horarios y botón de inscripción
import { useState } from 'react';
import { InscripcionForm } from './InscripcionForm';
import { useAuth } from '../contexts/AuthContext';

// Colores para los badges según la categoría del club
const BADGE_COLORS = {
  Deportes: (dark) =>
    dark
      ? "text-amber-300 bg-amber-400/10 border-amber-400/20"
      : "text-amber-700 bg-amber-100 border-amber-200",
  Cultura: (dark) =>
    dark
      ? "text-blue-300 bg-blue-400/10 border-blue-400/20"
      : "text-blue-700 bg-blue-100 border-blue-200",
  Tecnología: (dark) =>
    dark
      ? "text-green-300 bg-green-400/10 border-green-400/20"
      : "text-green-700 bg-green-100 border-green-200",
};

// Retorna las clases CSS del badge según la categoría
function badgeClasses(categoria, modoOscuro) {
  const fn = BADGE_COLORS[categoria];
  return fn ? fn(modoOscuro) : BADGE_COLORS.Deportes(modoOscuro);
}

// Página de detalle de un club con información completa
export function DetalleClub({ club, onVolver, tema, modoOscuro, onLoginClick }) {
  const { isAuthenticated, isAdmin, tieneInscripcionActiva, clubesPostulados } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const cupoActual = parseInt(club.cupo_actual) || 0;
  const lleno = cupoActual >= club.cupo_maximo;
  const disponibles = club.cupo_maximo - cupoActual;
  const isProximamente = club.id_estatus_club === 2;
  const isInactivo = club.id_estatus_club === 3;

  // Clases según el tema (oscuro/claro)
  const c = {
    bg: tema.text === "text-slate-200" ? "bg-[#0e162c] border-slate-700/50" : "bg-white border-slate-200",
    text: tema.text === "text-slate-200" ? "text-slate-300" : "text-slate-600",
    title: tema.text === "text-slate-200" ? "text-white" : "text-slate-900",
    sidebar: tema.text === "text-slate-200" ? "bg-[#0e162c] border-slate-700/50" : "bg-white border-slate-200 shadow-lg",
  };

  // Maneja el clic en el botón de inscripción
  function handleBotonClick() {
    if (!isAuthenticated) {
      onLoginClick();
    } else if (isAdmin) {
      return;
    } else if (tieneInscripcionActiva) {
      alert("Ya eres miembro activo de un club.");
    } 
    // 2. Usamos la lista para ver si YA SE POSTULÓ A ESTE CLUB EN ESPECÍFICO
    else if (clubesPostulados.includes(club.id_club)) {
      alert("Ya enviaste una solicitud para este club. No puedes duplicarla.");
    } 
    // 3. Usamos la lista para contar cuántas lleva (el .length)
    else if (clubesPostulados.length >= 3) {
      alert("Ya tienes 3 postulaciones en proceso. Espera una respuesta.");
    } 
    else {
      setShowForm(true);
    }
  }

  // Determina el texto del botón según el estado del usuario y el club
  function getBotonTexto() {
    if (isProximamente) return null;
    if (isInactivo) return null;
    if (!isAuthenticated) return 'INICIA SESIÓN PARA INSCRIBIRTE';
    if (isAdmin) return null;
    if (tieneInscripcionActiva) return null;
    return 'INSCRIBIRME AHORA';
  }

  const botonTexto = getBotonTexto();

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8 pb-20 md:pb-8">
        <button
          onClick={onVolver}
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7l-7-7 7-7" />
          </svg>
          Volver al catálogo
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          {/* Columna principal: imagen, descripción, lugar y horarios */}
          <div className="md:col-span-2 space-y-6">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={club.imagen_portada || club.imagen}
                alt={club.nombre_club}
                className={`w-full h-full object-cover ${isProximamente ? 'opacity-60' : ''}`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${badgeClasses(club.categoria, modoOscuro)}`}>
                {club.categoria}
              </span>
              {isProximamente && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-slate-500 border-slate-500/30 bg-slate-500/10">
                  Próximamente
                </span>
              )}
              {isInactivo && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-red-400 border-red-400/30 bg-red-400/10">
                  Inactivo
                </span>
              )}
            </div>

            <h1 className={`text-3xl md:text-4xl font-black leading-tight ${c.title}`}>
              {club.nombre_club}
            </h1>

            <p className={`text-base leading-relaxed ${c.text}`}>
              {club.descripcion}
            </p>

            {club.lugar && (
              <div className={`rounded-2xl border p-6 transition-colors duration-300 ${c.bg}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.title}`}>
                  Lugar de Entrenamiento
                </h3>
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className={`text-sm font-medium ${c.text}`}>{club.lugar}</p>
                </div>
              </div>
            )}

            {club.horarios && (
              <div className={`rounded-2xl border p-6 transition-colors duration-300 ${c.bg}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.title}`}>
                  Horarios y Días Detallados
                </h3>
                <div className="space-y-3">
                  {club.horarios.map((h, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className={`text-sm font-medium ${c.text}`}>
                        <strong className={c.title}>{h.dia}:</strong> {h.horario}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: información y botón de acción */}
          <div>
            <div className={`md:sticky md:top-6 rounded-2xl border p-6 space-y-5 transition-colors duration-300 ${c.sidebar}`}>
              <div>
                <h3 className={`text-lg font-bold ${c.title}`}>
                  {club.nombre_club}
                </h3>
                <span className={`inline-block mt-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${badgeClasses(club.categoria, modoOscuro)}`}>
                  {club.categoria}
                </span>
              </div>

              <div className={`h-px ${tema.headerBorder}`} />

              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold block text-slate-500">
                  Lugares Disponibles
                </span>
                <p className={`text-2xl font-black mt-1 ${lleno ? 'text-red-400' : c.title}`}>
                  {isProximamente || isInactivo ? (
                    '—'
                  ) : disponibles > 0 ? (
                    <>{cupoActual} de {club.cupo_maximo} lugares</>
                  ) : (
                    "Completo"
                  )}
                </p>
              </div>

              {botonTexto && (
                <button
                  onClick={handleBotonClick}
                  className={`w-full font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    !isAuthenticated
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-amber-400 hover:bg-amber-500 text-[#0e162c]'
                  }`}
                >
                  {botonTexto}
                </button>
              )}

              {isAdmin && isAuthenticated && (
                <p className="text-sm text-slate-500 font-medium text-center">
                  Los administradores no pueden inscribirse a clubes.
                </p>
              )}

              {isAuthenticated && tieneInscripcionActiva && !isAdmin && (
                <p className="text-sm text-amber-400 font-medium text-center">
                  Ya estás inscrito en un club.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <InscripcionForm
          club={club}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}

// ✦ A
