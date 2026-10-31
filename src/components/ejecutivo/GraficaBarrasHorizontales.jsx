/* Gráfica de barras horizontales para comparar clubes o licenciaturas. */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

function TooltipPersonalizado({ activo, payload, label }) {
  if (!activo || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-[#0e162c] border border-slate-700/60 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-black text-amber-400">{p.value} {p.unit || ''}</p>
    </div>
  );
}

export function GraficaBarrasHorizontales({ titulo, datos, dataKey = 'valor', labelKey = 'nombre', unit = '', color = '#f59e0b', maxDomain, cargando }) {
  const { cardCls, modoOscuro } = useTheme();

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {titulo}
        </h3>
      </div>
      <div className="px-4 py-4" style={{ height: Math.max(280, datos.length * 40) }}>
        {cargando ? (
          <p className="text-center text-sm text-slate-400">Cargando...</p>
        ) : datos.length === 0 ? (
          <p className={`text-center text-sm ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>Sin datos disponibles.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 24, left: 80, bottom: 0 }}>
              <XAxis
                type="number"
                domain={[0, maxDomain || 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#64748b' : '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                dataKey={labelKey}
                type="category"
                width={70}
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#cbd5e1' : '#475569', fontSize: 10 }}
                tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Bar dataKey={dataKey} unit={unit} radius={[0, 4, 4, 0]}>
                {datos.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
