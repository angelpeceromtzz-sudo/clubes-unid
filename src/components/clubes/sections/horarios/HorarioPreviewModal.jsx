import { Icono } from '../../../ui/Icono';
import { DIAS } from '../../../../constants/horario';
import { horaStr } from '../../../../utils/horario';

export function HorarioPreviewModal({ show, horarios, modoOscuro, onClose }) {
  if (!show) return null;

  const diasConHorarios = [1, 2, 3, 4, 5, 6, 0].filter(dia => horarios.some(h => h.dia_semana === dia));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col
        ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0
          ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <div>
            <h3 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
              Vista previa del alumno
            </h3>
            <p className={`text-[11px] mt-0.5 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
              Así verán el horario los miembros del club
            </p>
          </div>
          <button onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer
              ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-auto p-4 space-y-3">
          {diasConHorarios.map(dia => {
            const bloques = horarios.filter(h => h.dia_semana === dia);
            return (
              <div key={dia}
                className={`rounded-xl border overflow-hidden
                  ${modoOscuro ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                <div className={`px-4 py-2.5 border-b font-bold text-xs uppercase tracking-wider
                  ${modoOscuro ? 'border-slate-700/50 text-amber-400' : 'border-slate-200 text-amber-600'}`}>
                  {DIAS[dia]}
                </div>
                {bloques.map(b => (
                  <div key={b.id_horario}
                    className={`px-4 py-3 border-b last:border-b-0
                      ${modoOscuro ? 'border-slate-700/30' : 'border-slate-200/60'}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Icono nombre="clock" className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} />
                        <span className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                          {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icono nombre="location" className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/60" strokeWidth={2} />
                        <span className={`text-xs break-words ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{b.lugar}</span>
                      </div>
                      {b.descripcion && (
                        <p className={`text-xs leading-snug break-words whitespace-pre-wrap ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                          {b.descripcion}
                        </p>
                      )}
                      {b.ubicacion_maps && (
                        <a href={b.ubicacion_maps} target="_blank" rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs font-bold mt-0.5 transition-colors
                            ${modoOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}>
                          <Icono nombre="location" className="h-3 w-3" strokeWidth={2} />
                          Ver ubicación
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
