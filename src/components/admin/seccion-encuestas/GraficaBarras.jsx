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
import { useTheme } from '../../../contexts/ThemeContext';

export function GraficaBarras({ filas }) {
  const { tema } = useTheme();

  if (!filas?.length) return null;

  return (
    <div className="flex flex-col gap-3 mt-2">
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="flex flex-col w-full">
          <div className="flex justify-between items-center mb-1 gap-4">
            <span
              className={`text-sm font-semibold truncate ${tema.title}`}
              title={fila.etiqueta}
            >
              {fila.etiqueta}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold ${tema.subtitle}`}>
                {fila.conteo} {fila.conteo === 1 ? 'resp.' : 'resp.'}
              </span>
              <span className="text-sm font-black whitespace-nowrap text-amber-500 w-12 text-right">
                {fila.porcentaje}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${fila.porcentaje}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
