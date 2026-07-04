/* Encabezado de página con título, subtítulo opcional y un área para acciones (botones). */
import { useTheme } from '../../contexts/ThemeContext';

export function EncabezadoPagina({ titulo, subtitulo, accion }) {
  const { tema } = useTheme();
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>{titulo}</h2>
        {subtitulo && <p className={`text-sm mt-0.5 ${tema.subtitle}`}>{subtitulo}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}
