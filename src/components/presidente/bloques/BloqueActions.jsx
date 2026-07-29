import { useTheme } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';

export function BloqueActions({ editando, guardando, enviando, completo, onToggleEdit, onEnviar, onImprimir }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={onToggleEdit}
        className={`flex-1 border rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
          modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
        }`}
      >
        {editando ? 'Cerrar' : 'Editar fecha/hora/lugar'}
      </button>
      <button
        onClick={onEnviar}
        disabled={enviando || !completo}
        className="flex-1 border border-indigo-500/40 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
      >
        {enviando ? (
          <Spinner size="sm" color="border-current" className="!py-0" />
        ) : 'Enviar convocatoria'}
      </button>
      <button
        onClick={onImprimir}
        className="flex-1 border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
      >
        Lista de asistencia
      </button>
    </div>
  );
}
