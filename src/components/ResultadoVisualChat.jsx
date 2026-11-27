import { Link } from 'react-router-dom';
import { BarChart3, Database, ExternalLink } from 'lucide-react';

function Ruta({ url, children, className = '' }) {
  return url?.startsWith('/') ? <Link to={url} className={className}>{children}</Link> : <span className={className}>{children}</span>;
}

export function ResultadoVisualChat({ visualizacion }) {
  if (!visualizacion) return null;
  if (visualizacion.tipo === 'metrica') return <div className="mt-3 overflow-hidden rounded-xl border border-amber-400/30 bg-white p-3 dark:bg-[#0e162c]">
    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Dato del sistema</p>
    <div className="mt-1 flex items-baseline gap-2"><strong className="text-3xl font-black tabular-nums text-[#0e162c] dark:text-amber-300">{visualizacion.valor}</strong><span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{visualizacion.titulo}</span></div>
    {visualizacion.detalle && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{visualizacion.detalle}</p>}
  </div>;
  if (visualizacion.tipo !== 'ranking' || !visualizacion.elementos?.length) return null;
  const maximo = Math.max(...visualizacion.elementos.map(item => Number(item.valor) || 0), 1);
  return <div className="mt-3 rounded-xl border border-amber-400/30 bg-white p-3 dark:bg-[#0e162c]">
    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-black text-[#0e162c] dark:text-white"><BarChart3 size={15} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />{visualizacion.titulo}</h3>
    <div className="space-y-2.5">{visualizacion.elementos.map((item, indice) => <div key={`${item.nombre}-${indice}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]"><Ruta url={item.url} className="min-w-0 truncate font-semibold text-slate-800 hover:underline dark:text-slate-100">{item.nombre}</Ruta><span className="shrink-0 font-black tabular-nums text-[#0e162c] dark:text-amber-300">{item.valor}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, Number(item.valor) / maximo * 100))}%` }} /></div>
    </div>)}</div>
    <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{visualizacion.unidad} · datos actuales</p>
  </div>;
}

export function FuentesChat({ fuentes }) {
  if (!fuentes?.length) return null;
  const fecha = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Merida', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(fuentes[0].consultadoEn));
  return <details className="mt-3 border-t border-amber-400/20 pt-2 text-[11px]">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-slate-600 marker:hidden hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300 [&::-webkit-details-marker]:hidden"><Database size={13} aria-hidden="true" /> Ver datos consultados · {fecha}</summary>
    <div className="mt-2 flex flex-wrap gap-1.5">{fuentes.map((fuente, indice) => <Ruta key={`${fuente.nombre}-${indice}`} url={fuente.url} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-amber-400/30 bg-white px-2 py-1 text-[11px] font-medium text-[#0e162c] hover:border-amber-500 hover:bg-amber-50 dark:bg-[#0e162c] dark:text-slate-200 dark:hover:bg-[#18223f]"><span className="truncate">{fuente.nombre}</span>{fuente.url && <ExternalLink size={11} className="shrink-0" aria-hidden="true" />}</Ruta>)}</div>
  </details>;
}
