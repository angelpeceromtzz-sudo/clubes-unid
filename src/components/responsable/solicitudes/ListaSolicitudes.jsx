import { Badge } from '../../ui/Badge';
import { TarjetaSolicitud } from './TarjetaSolicitud';

export function ListaSolicitudes({ titulo, solicitudes, color = 'blue', seleccionados, onToggleSeleccion, themeTitle }) {
  if (solicitudes.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className={`text-lg font-black uppercase tracking-wider ${themeTitle}`}>{titulo}</h3>
        <Badge texto={solicitudes.length} color={color} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {solicitudes.map((s, i) => (
          <TarjetaSolicitud
            key={s.id_formulario ?? `sol-${i}`}
            solicitud={s}
            seleccionados={seleccionados}
            onToggleSeleccion={onToggleSeleccion}
          />
        ))}
      </div>
    </div>
  );
}
