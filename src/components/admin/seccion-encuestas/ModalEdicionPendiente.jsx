/* Diálogo de confirmación cuando hay una pregunta en edición y se quiere abrir
 * otra (o agregar una nueva).
 *
 * Es local a la carpeta de encuestas porque `ModalConfirmacion` sólo ofrece
 * dos acciones y aquí hacen falta tres: aplicar lo escrito, descartarlo o
 * seguir editando la anterior.
 */
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';

export function ModalEdicionPendiente({ show, mensaje, onAplicar, onDescartar, onSeguir, cargando }) {
  const { modoOscuro } = useTheme();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className={`relative rounded-2xl w-full max-w-sm p-8 border ${
          modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-amber-400/15">
            <Icono nombre="help" strokeWidth={2} className="h-7 w-7 text-amber-400" />
          </div>

          <h3
            className={`text-lg font-black uppercase tracking-wider mb-2 ${
              modoOscuro ? 'text-white' : 'text-slate-900'
            }`}
          >
            Hay una pregunta en edición
          </h3>

          <p className={`text-sm mb-6 leading-relaxed ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            {mensaje}
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              type="button"
              onClick={onAplicar}
              disabled={cargando}
              className="rounded-xl px-5 py-3 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Aplicar cambios
            </button>

            <button
              type="button"
              onClick={onDescartar}
              disabled={cargando}
              className={`rounded-xl px-5 py-3 font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                modoOscuro
                  ? 'border border-slate-600 text-slate-300 hover:bg-slate-800'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Descartar
            </button>

            <button
              type="button"
              onClick={onSeguir}
              disabled={cargando}
              className="text-xs font-bold underline cursor-pointer disabled:opacity-40"
            >
              Seguir editando la anterior
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
