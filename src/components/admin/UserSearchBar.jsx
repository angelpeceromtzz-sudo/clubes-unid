export function BarraBusquedaUsuarios({ busqueda, onChange, isDark }) {
  return (
    <div className="relative mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={busqueda}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por ID, nombre o correo..."
        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
          isDark
            ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
            : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
        }`}
      />
    </div>
  );
}
