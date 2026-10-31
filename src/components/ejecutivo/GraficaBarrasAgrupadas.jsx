/* Gráfica de barras verticales agrupadas para comparar series por mes. */
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

function TooltipPersonalizado({ activo, payload, label }) {
  if (!activo || !payload?.length) return null;
  return (
    <div className="bg-[#0e162c] border border-slate-700/60 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-black" style={{ color: p.color }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}

export function GraficaBarrasAgrupadas({ titulo, datos, series, cargando }) {
  const { cardCls, modoOscuro } = useTheme();

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          {titulo}
        </h3>
      </div>
      <div className="px-4 py-4" style={{ height: 280 }}>
        {cargando ? (
          <p className="text-center text-sm text-slate-400">Cargando...</p>
        ) : datos.length === 0 ? (
          <p className={`text-center text-sm ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>Sin datos disponibles.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} barCategoryGap="25%" barGap={4} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 600 }}
                interval={0}
                angle={datos.length > 6 ? -30 : 0}
                textAnchor={datos.length > 6 ? 'end' : 'middle'}
                height={datos.length > 6 ? 50 : 30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#64748b' : '#94a3b8', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {series.map((s) => (
                <Bar key={s.dataKey} dataKey={s.dataKey} name={s.nombre} fill={s.color} radius={[4, 4, 0, 0]} barSize={18} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
