import { useTheme } from '../../contexts/ThemeContext';
import { Alerta } from '../ui/Alerta';
import { TarjetaSeleccion } from './TarjetaSeleccion';

export function PasoActividadResponsable({ actividades, seleccion, onAlternar }) {
  const { modoOscuro } = useTheme();
  const hayActividades = actividades.length > 0;

  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Qué actividad te gustaría coordinar?
      </h2>
      <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
        Elige las actividades para las que te gustaría ser responsable. Puedes elegir varias.
      </p>

      {!hayActividades && (
        <div className="mt-6">
          <Alerta tipo="info" mensaje="Vuelve al paso de actividades y selecciona al menos una para poder indicar cuáles te gustaría coordinar." />
        </div>
      )}

      {hayActividades && (
        <fieldset className="mt-6">
          <legend className="sr-only">Actividades a coordinar</legend>
          <div className="flex flex-wrap gap-2">
            {actividades.map((actividad) => (
              <TarjetaSeleccion
                key={actividad.id}
                id={`responsable-${actividad.id}`}
                variante="chip"
                seleccionada={seleccion.includes(actividad.id)}
                onAlternar={() => onAlternar(actividad.id)}
                titulo={actividad.nombre}
              />
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}