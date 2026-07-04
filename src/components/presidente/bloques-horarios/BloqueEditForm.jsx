export function BloqueEditForm({ form, guardando, onFormChange, onGuardar, onCancelar }) {
  return (
    <div className="space-y-3 mb-4">
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Fecha</label>
        <input
          type="date"
          value={form.fecha}
          onChange={(e) => onFormChange('fecha', e.target.value)}
          className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Hora</label>
        <input
          type="time"
          value={form.hora}
          onChange={(e) => onFormChange('hora', e.target.value)}
          className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Lugar</label>
        <input
          type="text"
          value={form.lugar}
          onChange={(e) => onFormChange('lugar', e.target.value)}
          placeholder="Edificio, salón, etc."
          className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancelar}
          disabled={guardando}
          className="flex-1 border border-slate-600 text-slate-300 hover:bg-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40"
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
