import { useTheme } from '../../contexts/ThemeContext';
import { Alerta } from '../ui/Alerta';
import { TarjetaSeleccion } from './TarjetaSeleccion';
import { ICONO_MOTIVACION } from '../../constants/onboarding';

export function PasoMotivaciones({ motivaciones, seleccion, onAlternar }) {
  const { modoOscuro } = useTheme();
  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Qué buscas al unirte a un club?
      </h2>
      <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
        Queremos conocer qué te motiva. Puedes elegir varias opciones.
      </p>

      {motivaciones.length === 0 ? (
        <div className="mt-6">
          <Alerta tipo="info" mensaje="Por ahora no hay opciones disponibles." />
        </div>
      ) : (
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Motivaciones</legend>
          {motivaciones.map((motivacion) => (
            <TarjetaSeleccion
              key={motivacion.id}
              id={`motivacion-${motivacion.id}`}
              seleccionada={seleccion.includes(motivacion.id)}
              onAlternar={() => onAlternar(motivacion.id)}
              icono={ICONO_MOTIVACION[motivacion.codigo] ?? 'star'}
              titulo={motivacion.nombre}
              indicador="cuadro"
            />
          ))}
        </fieldset>
      )}
    </div>
  );
}
