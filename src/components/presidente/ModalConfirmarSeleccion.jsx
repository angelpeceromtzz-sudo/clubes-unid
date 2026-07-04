import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';

export function ModalConfirmarSeleccion({ aceptados, noSeleccionados, onConfirmar, onCancelar, cargando }) {
  const { modoOscuro } = useTheme();
  if (aceptados.length === 0 && noSeleccionados.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-xl'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Icono nombre="check-circle" className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h3 className={`text-lg font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                Confirmar selección
              </h3>
              <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                Los alumnos seleccionados recibirán una oferta de ingreso. Ellos deberán aceptarla para ser miembros.
              </p>
            </div>
          </div>

          {aceptados.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Aceptados ({aceptados.length})</span>
              </div>
              <div className={`rounded-xl p-3 space-y-1.5 ${modoOscuro ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                {aceptados.map((a) => (
                  <div key={a.id_formulario} className="flex items-center gap-2 text-sm">
                    <Icono nombre="check" className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
                    <span className={modoOscuro ? 'text-slate-200' : 'text-slate-700'}>{a.nombre_completo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {noSeleccionados.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-wider font-bold text-red-400">No seleccionados ({noSeleccionados.length})</span>
              </div>
              <div className={`rounded-xl p-3 space-y-1.5 ${modoOscuro ? 'bg-red-500/5 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                {noSeleccionados.map((a) => (
                  <div key={a.id_formulario} className="flex items-center gap-2 text-sm">
                    <Icono nombre="close" className="h-4 w-4 text-red-500 shrink-0" strokeWidth={2.5} />
                    <span className={modoOscuro ? 'text-slate-200' : 'text-slate-700'}>{a.nombre_completo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`rounded-xl p-3 mb-4 ${modoOscuro ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-xs font-medium ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`}>
              Los alumnos seleccionados recibirán una oferta de ingreso con {14} días para responder. Los no seleccionados recibirán una notificación informando que su proceso ha concluido.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              disabled={cargando}
              className={`flex-1 border rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 ${
                modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={cargando}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm uppercase tracking-wider rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <Spinner size="sm" color="border-black" className="!py-0" />
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
