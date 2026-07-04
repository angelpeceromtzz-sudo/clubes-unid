import { useState } from 'react';
import { FormularioInscripcion } from './FormularioInscripcion';
import { useAutenticacion } from '../contexts/AuthContext';
import { clasesBadge } from '../constants/colores';
import { Icono } from './ui/Icono';

export function DetalleClub({ club, onVolver, tema, modoOscuro, onLoginClick }) {
  const { estaAutenticado, esAdmin, tieneInscripcionActiva, clubesPostulados } = useAutenticacion();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cupoActual = parseInt(club.cupo_actual) || 0;
  const lleno = cupoActual >= club.cupo_maximo;
  const disponibles = club.cupo_maximo - cupoActual;
  const esProximamente = club.id_estatus_club === 2;
  const esInactivo = club.id_estatus_club === 3;

  const c = {
    bg: tema.text === "text-slate-200" ? "bg-[#0e162c] border-slate-700/50" : "bg-white border-slate-200",
    text: tema.text === "text-slate-200" ? "text-slate-300" : "text-slate-600",
    title: tema.text === "text-slate-200" ? "text-white" : "text-slate-900",
    sidebar: tema.text === "text-slate-200" ? "bg-[#0e162c] border-slate-700/50" : "bg-white border-slate-200 shadow-lg",
  };

  function manejarClickBoton() {
    if (!estaAutenticado) {
      onLoginClick();
    } else if (esAdmin) {
      return;
    } else if (tieneInscripcionActiva) {
      alert("Ya eres miembro activo de un club.");
    } else if (clubesPostulados.includes(club.id_club)) {
      alert("Ya enviaste una solicitud para este club. No puedes duplicarla.");
    } else if (clubesPostulados.length >= 3) {
      alert("Ya tienes 3 postulaciones en proceso. Espera una respuesta.");
    } else {
      setMostrarFormulario(true);
    }
  }

  function obtenerTextoBoton() {
    if (esProximamente) return null;
    if (esInactivo) return null;
    if (!estaAutenticado) return 'INICIA SESIÓN PARA INSCRIBIRTE';
    if (esAdmin) return null;
    if (tieneInscripcionActiva) return null;
    return 'INSCRIBIRME AHORA';
  }

  const botonTexto = obtenerTextoBoton();

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8 pb-20 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          <div className="md:col-span-2 space-y-6">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={club.imagen_portada || club.imagen}
                alt={club.nombre_club}
                className={`w-full h-full object-cover ${esProximamente ? 'opacity-60' : ''}`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(club.categoria, modoOscuro)}`}>
                {club.categoria}
              </span>
              {esProximamente && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border text-slate-500 border-slate-500/30 bg-slate-500/10">
                  Próximamente
                </span>
              )}
              {esInactivo && (
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
                  <Icono nombre="location" className="h-5 w-5 text-amber-400 shrink-0" />
                  <Icono nombre="location-point" className="h-5 w-5 text-amber-400 shrink-0" />
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

          <div>
            <div className={`md:sticky md:top-6 rounded-2xl border p-6 space-y-5 transition-colors duration-300 ${c.sidebar}`}>
              <div>
                <h3 className={`text-lg font-bold ${c.title}`}>
                  {club.nombre_club}
                </h3>
                <span className={`inline-block mt-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${clasesBadge(club.categoria, modoOscuro)}`}>
                  {club.categoria}
                </span>
              </div>

              <div className={`h-px ${tema.headerBorder}`} />

              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold block text-slate-500">
                  Lugares Disponibles
                </span>
                <p className={`text-2xl font-black mt-1 ${lleno ? 'text-red-400' : c.title}`}>
                  {esProximamente || esInactivo ? (
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
                  onClick={manejarClickBoton}
                  className={`w-full font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    !estaAutenticado
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-amber-400 hover:bg-amber-500 text-[#0e162c]'
                  }`}
                >
                  {botonTexto}
                </button>
              )}

              {esAdmin && estaAutenticado && (
                <p className="text-sm text-slate-500 font-medium text-center">
                  Los administradores no pueden inscribirse a clubes.
                </p>
              )}

              {estaAutenticado && tieneInscripcionActiva && !esAdmin && (
                <p className="text-sm text-amber-400 font-medium text-center">
                  Ya estás inscrito en un club.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {mostrarFormulario && (
        <FormularioInscripcion
          club={club}
          onClose={() => setMostrarFormulario(false)}
        />
      )}
    </>
  );
}
