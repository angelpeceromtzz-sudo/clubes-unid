import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

export function VistaPreviaConvocatorias({ vistaPrevia, generando, onConfirmar, onCancelar }) {
  const { tema, modoOscuro } = useTheme();

  return (
    <div className={`rounded-2xl p-6 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
          <Icono nombre="check-circle" strokeWidth={2} className="h-5 w-5" />
        </div>
        <div>
          <h3 className={`text-base font-black uppercase tracking-wider ${tema.title}`}>
            Vista previa de convocatorias
          </h3>
          <p className={`text-sm ${tema.subtitle}`}>
            Has preseleccionado <strong>{vistaPrevia.total}</strong> alumno{vistaPrevia.total !== 1 ? 's' : ''}.
            El sistema generará automáticamente:
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {vistaPrevia.bloques.map((b) => (
          <div key={b.bloque} className="bg-[#18223f] rounded-xl p-4 border border-slate-700/50 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Bloque {b.bloque}</p>
            <p className="text-2xl font-black text-amber-400">{b.alumnos}</p>
            <p className="text-xs text-slate-500">alumno{b.alumnos !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      <p className={`text-xs mb-4 ${tema.subtitle}`}>
        * Los bloques se asignan por fecha de envío del formulario. No es posible modificar la distribución manualmente.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancelar}
          disabled={generando}
          className={`flex-1 border rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 ${
            modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={generando}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {generando ? (
            <span className="animate-spin w-4 h-4 border-2 border-[#0e162c] border-t-transparent rounded-full" />
          ) : (
            'Confirmar y Generar Convocatorias'
          )}
        </button>
      </div>
    </div>
  );
}
