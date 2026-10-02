import { TablaClubes } from '../tablas/TablaClubes';

export function SeccionClubesAdmin({ d }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${d.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={d.busquedaClubes}
            onChange={(e) => d.setBusquedaClubes(e.target.value)}
            placeholder="Buscar club por nombre o categoría..."
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${
              d.isDark
                ? 'bg-[#0e162c] border-slate-700 text-slate-200 placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>
        <button
          onClick={d.abrirModalCrear}
          className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          Agregar Nuevo Club
        </button>
      </div>
      <TablaClubes
        clubes={d.clubesFiltrados}
        onStatusChange={d.handleStatusChange}
        onEditar={d.abrirModalEditar}
        onCrear={d.abrirModalCrear}
      />
    </div>
  );
}
