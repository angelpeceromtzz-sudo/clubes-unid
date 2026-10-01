// Barras horizontales para distribuciones: opciones de una pregunta y eje de una
// escala.
//
// Se elige horizontal y no vertical a propósito. Las etiquetas de las opciones
// son frases ("No me importa el horario", "Emprendimiento"), y en vertical
// recharts las rota o las recorta; horizontales caben completas sin trucos.
//
// Los datos vienen ya con `conteo` y `porcentaje` del backend. Este componente no
// calcula porcentajes a propósito: la base de la que salen depende del tipo de
// pregunta (respondientes contra total) y equivocarse aquí daría barras que no
// cuadran con la respuesta que registró el backend.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '../../../contexts/ThemeContext';

// Un mismo color para todas las barras. La paleta por categoría existe en
// constants/colores.js pero es para los clubes; aplicar aquí una rampa de color
// por fila sugeriría un orden de magnitud entre opciones que no existe.
const COLOR_BARRA = '#f59e0b';

function TooltipDistribucion({ activo, payload }) {
  if (!activo || !payload?.length) return null;

  const fila = payload[0].payload;

  return (
    <div className="bg-[#0e162c] border border-slate-700/60 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-sm font-bold text-white">{fila.etiqueta}</p>
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
        {fila.conteo} {fila.conteo === 1 ? 'respuesta' : 'respuestas'}
      </p>
      <p className="text-sm font-black text-amber-400">{fila.porcentaje}%</p>
    </div>
  );
}

/**
 * @param {object[]} filas  [{ etiqueta, conteo, porcentaje }]
 * @param {number}   alto   Alto en px. 26 por fila es lo mínimo para que el
 *                           texto de la opción no se corte.
 */
export function GraficaBarras({ filas, alto }) {
  const { modoOscuro } = useTheme();

  if (!filas?.length) return null;

  // Alto según cuántas filas hay, en vez de un alto fijo: cinco opciones en un
  // chart de 220px quedan con las barras finísimas y el texto encima de la
  // siguiente.
  const altoCalculado = alto ?? Math.max(140, filas.length * 34 + 40);

  return (
    <div style={{ height: altoCalculado }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={190}
            axisLine={false}
            tickLine={false}
            tick={{ fill: modoOscuro ? '#cbd5e1' : '#334155', fontSize: 11, fontWeight: 600 }}
          />
          <Tooltip content={<TooltipDistribucion />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <Bar dataKey="conteo" radius={[0, 6, 6, 0]} barSize={18}>
            {filas.map((fila) => (
              <Cell key={fila.etiqueta} fill={COLOR_BARRA} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
