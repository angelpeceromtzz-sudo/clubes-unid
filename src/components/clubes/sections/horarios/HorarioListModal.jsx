import { Icono } from '../../../ui/Icono';
import { DIAS } from '../../../../constants/horario';
import { horaStr } from '../../../../utils/horario';

export function HorarioListModal({ show, horarios, modoOscuro, onClose, onEditar, onEliminar }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md max-h-[70vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col
        ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'}`}
        onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0
          ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            Editar horarios
          </h3>
          <button onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer
              ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2">
          {horarios.length === 0 && (
            <p className={`text-xs text-center py-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
              Sin horarios registrados
            </p>
          )}
          {[1, 2, 3, 4, 5, 6, 0].map(dia => {
            const bloques = horarios.filter(h => h.dia_semana === dia);
            if (!bloques.length) return null;
            return (
              <div key={dia}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1
                  ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`}>
                  {DIAS[dia]}
                </p>
                {bloques.map(b => (
                  <div key={b.id_horario}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 border
                      ${modoOscuro ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                    <Icono nombre="clock" className={`h-3.5 w-3.5 shrink-0 ${modoOscuro ? 'text-amber-400' : 'text-amber-500'}`} strokeWidth={2} />
                    <span className={`text-xs font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                      {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                    </span>
                    <span className={`text-[11px] ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                      {b.lugar}
                    </span>
                    <div className="flex-1" />
                    <button onClick={() => { onClose(); onEditar(b); }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer
                        ${modoOscuro ? 'bg-slate-700 text-slate-300 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'}`}>
                      Editar
                    </button>
                    <button onClick={() => { onClose(); onEliminar(b.id_horario); }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer bg-red-500/10 text-red-400 hover:bg-red-500/20">
                      Borrar
                    </button>
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
