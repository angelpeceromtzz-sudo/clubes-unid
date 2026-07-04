/* Vista detalle de un club con sidebar, información, horarios, lugar y formulario de inscripción. */
import { useState } from 'react';
import { FormularioInscripcion } from '../formularios/FormularioInscripcion';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { InfoLugar } from './InfoLugar';
import { InfoHorarios } from './InfoHorarios';
import { SidebarClub } from './SidebarClub';
import { clasesBadge } from '../../constants/colores';

export function DetalleClub({ club, onVolver, onLoginClick }) {
  const { modoOscuro } = useTheme();
  const { estaAutenticado, esAdmin, tieneInscripcionActiva, clubesPostulados } = useAutenticacion();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cupoActual = parseInt(club.cupo_actual) || 0;
  const lleno = cupoActual >= club.cupo_maximo;
  const disponibles = club.cupo_maximo - cupoActual;
  const esProximamente = club.id_estatus_club === 2;
  const esInactivo = club.id_estatus_club === 3;

  const c = {
    bg: modoOscuro ? "bg-[#0e162c] border-slate-700/50" : "bg-white border-slate-200",
    text: modoOscuro ? "text-slate-300" : "text-slate-600",
    title: modoOscuro ? "text-white" : "text-slate-900",
    sidebar: modoOscuro ? "bg-[#0e162c] border-slate-700/50" : "bg-white border-slate-200 shadow-lg",
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
              <InfoLugar lugar={club.lugar} c={c} />
            )}

            <InfoHorarios horarios={club.horarios} c={c} />
          </div>

          <div>
            <SidebarClub
              club={club}
              c={c}
              modoOscuro={modoOscuro}
              lleno={lleno}
              disponibles={disponibles}
              esProximamente={esProximamente}
              esInactivo={esInactivo}
              botonTexto={botonTexto}
              estaAutenticado={estaAutenticado}
              esAdmin={esAdmin}
              tieneInscripcionActiva={tieneInscripcionActiva}
              onBotonClick={manejarClickBoton}
            />
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
