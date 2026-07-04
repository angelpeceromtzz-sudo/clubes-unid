import { useState } from 'react';
import { Icono } from '../ui/Icono';

const COLORES_ESTATUS = {
  'En revisión': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Preseleccionado': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Rechazado': 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TarjetaSolicitud({ solicitud, onPreseleccionar, onRechazar, accionando }) {
  const cargando = accionando[solicitud.id_formulario];
  const estatusActual = solicitud.status;
  const colorEstatus = COLORES_ESTATUS[estatusActual] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  const [motivoAbierto, setMotivoAbierto] = useState(false);

  return (
    <div className="bg-[#0e162c] border border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-600/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              {solicitud.nombre_completo.charAt(0)}
            </div>
            <div>
              <p className="text-white text-sm font-semibold truncate">{solicitud.nombre_completo}</p>
              <p className="text-slate-500 text-[11px] font-mono">{solicitud.matricula}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Carrera</span>
              <p className="text-slate-300 text-sm truncate">{solicitud.carrera}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Turno</span>
              <p className="text-slate-300 text-sm">{solicitud.turno}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Teléfono</span>
              <p className="text-slate-300 text-sm">{solicitud.telefono_contacto}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cuatrimestre</span>
              <p className="text-slate-300 text-sm">{solicitud.cuatrimestre}°</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${colorEstatus}`}>
              {estatusActual}
            </span>
          </div>

          <button
            onClick={() => setMotivoAbierto((p) => !p)}
            className="mt-2 text-[11px] uppercase tracking-wider text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
          >
            {motivoAbierto ? 'Ocultar motivo' : 'Ver motivo de ingreso'}
          </button>

          {motivoAbierto && (
            <div className="mt-2 bg-[#18223f] rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-300 text-sm leading-relaxed">{solicitud.motivo_ingreso}</p>
              {solicitud.experiencia_previa && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-2 mb-1">Experiencia previa</p>
                  <p className="text-slate-400 text-sm">{solicitud.experiencia_previa}</p>
                </>
              )}
            </div>
          )}
        </div>

        {estatusActual === 'En revisión' && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onPreseleccionar(solicitud.id_formulario)}
              disabled={cargando}
              className="border border-purple-500/40 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {cargando ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Icono nombre="check-circle" strokeWidth={2} className="h-3.5 w-3.5" />
              )}
              Preseleccionar
            </button>
            <button
              onClick={() => onRechazar(solicitud.id_formulario)}
              disabled={cargando}
              className="border border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {cargando ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Icono nombre="close" strokeWidth={2} className="h-3.5 w-3.5" />
              )}
              Rechazar
            </button>
          </div>
        )}
        {estatusActual !== 'En revisión' && (
          <div className="shrink-0">
            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${colorEstatus}`}>
              {estatusActual}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
