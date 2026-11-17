import { useTheme } from '../../contexts/ThemeContext';

function formatearFiltro(clave, valor, listas) {
  if (!valor) return null;
  if (clave === 'id_periodo') {
    const p = listas.periodos.find((x) => String(x.id_periodo) === String(valor));
    return p ? `Periodo: ${p.nombre}` : `Periodo: ${valor}`;
  }
  if (clave === 'id_club') {
    const c = listas.clubes.find((x) => String(x.id_club) === String(valor));
    return c ? `Club: ${c.nombre_club}` : `Club: ${valor}`;
  }
  if (clave === 'carrera') {
    const l = listas.licenciaturas.find((x) => String(x.id_licenciatura) === String(valor));
    return l ? `Licenciatura: ${l.nombre}` : `Licenciatura: ${valor}`;
  }
  if (clave === 'estado') return `Estado: ${valor}`;
  return null;
}

export function Filtro({ label, value, onChange, children }) {
  const { labelCls, selectCls } = useTheme();
  return (
    <label className="flex flex-col gap-1.5 min-w-[160px] flex-1">
      <span className={labelCls}>{label}</span>
      <select className={`${selectCls} text-sm`} value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}

export function EtiquetasFiltros({ filtros, listas }) {
  const { modoOscuro } = useTheme();
  const activos = Object.entries(filtros)
    .map(([clave, valor]) => formatearFiltro(clave, valor, listas))
    .filter(Boolean);
  if (activos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {activos.map((etiqueta) => (
        <span key={etiqueta} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${modoOscuro ? 'border-slate-600 bg-slate-800/60 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-600'}`}>
          {etiqueta}
        </span>
      ))}
    </div>
  );
}

export function ContenedorFiltros({ titulo, children, etiquetas, listas, onRestablecer, textoRestablecer = 'Restablecer' }) {
  const { cardCls, modoOscuro } = useTheme();
  return (
    <div className={`${cardCls} border rounded-2xl p-4`}>
      <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{titulo}</h3>
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        {children}
        <button
          type="button"
          onClick={onRestablecer}
          className="text-sm font-medium text-blue-500 hover:text-blue-600 self-end sm:mb-2.5"
        >
          {textoRestablecer}
        </button>
      </div>
      <EtiquetasFiltros filtros={etiquetas} listas={listas} />
    </div>
  );
}
