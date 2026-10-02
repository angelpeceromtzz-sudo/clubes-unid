import { Spinner } from '../../ui/Spinner';
import { Icono } from '../../ui/Icono';

export function ConvocatoriaGuardarButton({ guardando, errores, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={guardando || Object.values(errores).some(Boolean)}
      className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <Icono nombre="check" className="h-5 w-5" strokeWidth={2.5} />
      Guardar configuración
    </button>
  );
}

export function ConvocatoriaCerrarButton({ guardando, estado, onClick, modoOscuro }) {
  if (estado !== 'abierto') return null;

  return (
    <button
      onClick={onClick}
      disabled={guardando}
      className={`px-6 py-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed border ${
        modoOscuro
          ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
          : 'border-red-300 text-red-600 hover:bg-red-50'
      }`}
    >
      Cerrar convocatoria ahora
    </button>
  );
}

export function ConvocatoriaConfirmBox({ children, modoOscuro }) {
  return (
    <div className={`w-full rounded-2xl border p-4 ${modoOscuro ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
      {children}
    </div>
  );
}

export function ConvocatoriaConfirmCerrarBox({ guardando, onConfirmar, onCancelar, modoOscuro, tema }) {
  return (
    <div className={`rounded-2xl border p-4 ${modoOscuro ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
      <p className={`text-sm font-medium mb-3 ${tema.text}`}>
        ¿Cerrar la convocatoria ahora? Ya no se recibirán nuevas postulaciones. Los formularios que ya se recibieron no se verán afectados.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onConfirmar}
          disabled={guardando}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl px-4 py-3 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando ? (
            <Spinner size="sm" color="border-white" className="!py-0" />
          ) : (
            <>
              <Icono nombre="close" className="h-4 w-4" strokeWidth={2.5} />
              Sí, cerrar
            </>
          )}
        </button>
        <button
          onClick={onCancelar}
          disabled={guardando}
          className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            modoOscuro
              ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
              : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ConvocatoriaConfirmSaveBox({ resumenCambios, guardando, errores, onConfirmar, onCancelar, tema, modoOscuro }) {
  return (
    <ConvocatoriaConfirmBox modoOscuro={modoOscuro}>
      <p className={`text-sm font-medium mb-3 ${tema.text}`}>
        {resumenCambios}
      </p>
      <p className={`text-xs font-medium mb-3 ${tema.subtitle}`}>¿Confirmar cambios?</p>
      <div className="flex gap-3">
        <button
          onClick={onConfirmar}
          disabled={guardando || Object.values(errores).some(Boolean)}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-3 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando ? (
            <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
          ) : (
            <>
              <Icono nombre="check" className="h-4 w-4" strokeWidth={2.5} />
              Confirmar
            </>
          )}
        </button>
        <button
          onClick={onCancelar}
          disabled={guardando}
          className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            modoOscuro
              ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
              : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>
      </div>
    </ConvocatoriaConfirmBox>
  );
}
