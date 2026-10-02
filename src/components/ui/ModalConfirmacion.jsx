/* Modal de confirmación reutilizable: reemplaza window.confirm con estilo consistente.
   Props: show, titulo, mensaje, textoConfirmar, textoCancelar, varianteDanger, onConfirmar, onCancelar, cargando. */
import { Icono } from './Icono';
import { Spinner } from './Spinner';
import { useTheme } from '../../contexts/ThemeContext';

export function ModalConfirmacion({
  show,
  titulo = 'Confirmar',
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  varianteDanger = false,
  onConfirmar,
  onCancelar,
  cargando = false,
}) {
  const { modoOscuro } = useTheme();
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className={`relative rounded-2xl w-full max-w-sm p-8 border scrollbar-amber ${
          modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancelar}
          disabled={cargando}
          className="absolute top-4 right-4 text-white hover:text-amber-400 transition-colors cursor-pointer"
        >
          <Icono nombre="close" strokeWidth={2} className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              varianteDanger ? 'bg-red-500/15' : 'bg-amber-400/15'
            }`}
          >
            <Icono
              nombre={varianteDanger ? 'trash' : 'help'}
              strokeWidth={2}
              className={`h-7 w-7 ${varianteDanger ? 'text-red-400' : 'text-amber-400'}`}
            />
          </div>

          <h3
            className={`text-lg font-black uppercase tracking-wider mb-2 ${
              modoOscuro ? 'text-white' : 'text-slate-900'
            }`}
          >
            {titulo}
          </h3>

          <p
            className={`text-sm mb-6 leading-relaxed ${
              modoOscuro ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {mensaje}
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onCancelar}
              disabled={cargando}
              className={`flex-1 border rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 ${
                modoOscuro
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {textoCancelar}
            </button>
            <button
              onClick={onConfirmar}
              disabled={cargando}
              className={`flex-1 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${
                varianteDanger
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40'
                  : 'bg-amber-400 hover:bg-amber-500 text-[#0e162c]'
              }`}
            >
              {cargando ? (
                <Spinner size="sm" color={varianteDanger ? 'border-red-400' : 'border-[#0e162c]'} className="!py-0" />
              ) : (
                textoConfirmar
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
