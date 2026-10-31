/* Gráfica de barras horizontales apiladas: ocupados y disponibles por club. */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

function TooltipPersonalizado({ activo, payload, label }) {
  if (!activo || !payload?.length) return null;
  const total = payload.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  return (
    <div className="bg-[#0e162c] border border-slate-700/60 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-black" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
      <p className="text-xs text-slate-400 mt-1">Cupo: {total}</p>
    </div>
  );
}

export function GraficaOcupacionApilada({ titulo, datos, cargando }) {
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
            <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 24, left: 80, bottom: 0 }} stackOffset="expand">
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#64748b' : '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                dataKey="nombre_club"
                type="category"
                width={70}
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#cbd5e1' : '#475569', fontSize: 10 }}
                tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ocupado" name="Ocupados" stackId="a" fill="#10b981" />
              <Bar dataKey="disponible" name="Disponibles" stackId="a" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
