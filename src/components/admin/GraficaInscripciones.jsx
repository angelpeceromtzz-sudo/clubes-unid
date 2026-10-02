/* Gráfica de tendencia de inscripciones por mes usando Recharts. */
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';

function TooltipPersonalizado({ activo, payload, label }) {
  if (!activo || !payload?.length) return null;
  return (
    <div className="bg-[#0e162c] border border-slate-700/60 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-black text-amber-400">{payload[0].value} inscripciones</p>
    </div>
  );
}

export function GraficaInscripciones({ datos, cargando }) {
  const { cardCls, modoOscuro } = useTheme();

  return (
    <div className={`${cardCls} border rounded-2xl overflow-hidden`}>
      <div className="px-5 py-4 border-b" style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <h3 className={`text-sm font-black uppercase tracking-wider ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Tendencia de Inscripciones
        </h3>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : !datos?.length ? (
        <div className="py-16 px-4 text-center">
          <p className={`text-sm ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
            Sin datos de tendencia disponibles.
          </p>
        </div>
      ) : (
        <div className="px-4 py-4" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradienteAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: modoOscuro ? '#64748b' : '#94a3b8', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#gradienteAmber)"
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#0e162c', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
