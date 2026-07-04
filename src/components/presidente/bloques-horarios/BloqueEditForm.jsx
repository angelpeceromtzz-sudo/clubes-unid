import { useTheme } from '../../../contexts/ThemeContext';

export function BloqueEditForm({ form, guardando, onFormChange, onGuardar, onCancelar }) {
  const { modoOscuro } = useTheme();

  const inputCls = modoOscuro
    ? 'w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50'
    : 'w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50';

  return (
    <div className="space-y-3 mb-4">
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => onFormChange('fecha', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Hora</label>
        <input
          type="time"
          value={form.hora}
          onChange={(e) => onFormChange('hora', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Lugar</label>
        <input
          type="text"
          value={form.lugar}
          onChange={(e) => onFormChange('lugar', e.target.value)}
          placeholder="Edificio, salón, etc."
          className={`${inputCls} placeholder-slate-500`}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancelar}
          disabled={guardando}
          className={`flex-1 border rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 ${
            modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>
        <button
          onClick={onGuardar}
          disabled={guardando}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-[10px] uppercase tracking-widest rounded-xl px-3 py-2 transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1"
        >
          {guardando ? (
            <span className="animate-spin w-3 h-3 border-2 border-[#0e162c] border-t-transparent rounded-full" />
          ) : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
