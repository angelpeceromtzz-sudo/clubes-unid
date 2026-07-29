export function PaginacionActividad({ pagina, totalPaginas, modoOscuro, onPaginaChange }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        onClick={() => onPaginaChange(Math.max(1, pagina - 1))}
        disabled={pagina === 1}
        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${modoOscuro ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
      >
        Anterior
      </button>
      <span className={`text-xs font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        Pagina {pagina} de {totalPaginas}
      </span>
      <button
        onClick={() => onPaginaChange(Math.min(totalPaginas, pagina + 1))}
        disabled={pagina === totalPaginas}
        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${modoOscuro ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
      >
        Siguiente
      </button>
    </div>
  );
}
