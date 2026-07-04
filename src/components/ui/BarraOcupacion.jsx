export function BarraOcupacion({ nombre, maximo, ocupado, maxOcupado, modoOscuro }) {
  const pct = maximo > 0 ? Math.round((ocupado / maximo) * 100) : 0;
  const anchoRelativo = maxOcupado > 0 ? Math.round((ocupado / maxOcupado) * 100) : 0;
  const colorBarra = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-44 truncate shrink-0">{nombre}</span>
      <div className={`flex-1 h-3 ${modoOscuro ? 'bg-slate-700/50' : 'bg-slate-200'} rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full transition-all duration-500 ${colorBarra}`} style={{ width: `${Math.min(anchoRelativo, 100)}%` }} />
      </div>
      <span className="text-xs font-mono w-20 text-right shrink-0">{ocupado}/{maximo}</span>
      <span className="text-xs font-mono w-10 text-right shrink-0">{pct}%</span>
    </div>
  );
}
