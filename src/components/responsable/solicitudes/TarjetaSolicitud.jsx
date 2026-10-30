import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { AvatarInicial } from '../../ui/AvatarInicial';
import { Badge } from '../../ui/Badge';

export function TarjetaSolicitud({ solicitud, seleccionados, onToggleSeleccion }) {
  const { modoOscuro } = useTheme();
  const estatusActual = solicitud.status;
  const [motivoAbierto, setMotivoAbierto] = useState(false);
  const seleccionado = seleccionados.includes(solicitud.id_formulario);

  return (
    <div className={`rounded-xl p-4 transition-all ${modoOscuro ? 'bg-[#0e162c] border border-slate-700/50 hover:border-slate-600/50' : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {estatusActual === 'En revisión' && (
              <div
                onClick={() => onToggleSeleccion(solicitud.id_formulario)}
                className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors shrink-0 ${
                  seleccionado
                    ? 'bg-amber-400 border-amber-400'
                    : modoOscuro ? 'border-slate-600' : 'border-slate-400'
                }`}
              >
                {seleccionado && (
                  <svg className="h-full w-full text-[#0e162c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            <AvatarInicial nombre={solicitud.nombre_completo} color="amber" />
            <div>
              <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{solicitud.nombre_completo}</p>
              <p className="text-slate-500 text-[11px] font-mono">{solicitud.matricula}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Carrera</span>
              <p className={`text-sm truncate ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{solicitud.carrera}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Teléfono</span>
              <p className={`text-sm ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{solicitud.telefono_contacto}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cuatrimestre</span>
              <p className={`text-sm ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{solicitud.cuatrimestre}°</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge texto={estatusActual} color={
              estatusActual === 'En revisión' ? 'blue' : estatusActual === 'Preseleccionado' ? 'purple' : 'red'
            } />
          </div>

          <button
            onClick={() => setMotivoAbierto((p) => !p)}
            className="mt-2 text-[11px] uppercase tracking-wider text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
          >
            {motivoAbierto ? 'Ocultar motivo' : 'Ver motivo de ingreso'}
          </button>

          {motivoAbierto && (
            <div className={`mt-2 rounded-lg p-3 border ${modoOscuro ? 'bg-[#18223f] border-slate-700/30' : 'bg-slate-100 border-slate-200/30'}`}>
              <p className={`text-sm leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{solicitud.motivo_ingreso}</p>
              {solicitud.experiencia_previa && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-2 mb-1">Experiencia previa</p>
                  <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>{solicitud.experiencia_previa}</p>
                </>
              )}
            </div>
          )}
        </div>

        {estatusActual !== 'En revisión' && (
          <div className="shrink-0">
            <Badge texto={estatusActual} size="md" color={
              estatusActual === 'En revisión' ? 'blue' : estatusActual === 'Preseleccionado' ? 'purple' : 'red'
            } />
          </div>
        )}
      </div>
    </div>
  );
}
