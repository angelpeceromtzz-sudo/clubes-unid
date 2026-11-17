import { useTheme } from '../../contexts/ThemeContext';
import { Alerta } from '../ui/Alerta';
import { TarjetaSeleccion } from './TarjetaSeleccion';
import { LONGITUD_PROPUESTA } from '../../utils/onboardingReglas';

export function PasoActividades({
  categoriasSeleccionadas,
  actividades,
  seleccion,
  onAlternar,
  propuesta,
  onCambiarPropuesta,
  errorPropuesta = '',
}) {
  const { modoOscuro } = useTheme();
  const hayCategorias = categoriasSeleccionadas.length > 0;
  const idErrorPropuesta = 'error-propuesta-actividad';

  return (
    <div>
      <h2 id="titulo-paso" tabIndex={-1} className={`text-2xl font-black tracking-tight outline-none sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Qué actividades te gustaría realizar?
      </h2>
      <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
        Elige tus favoritas, incluso si todavía no existe un club para ellas.
      </p>

      {!hayCategorias && (
        <div className="mt-6">
          <Alerta tipo="info" mensaje="Vuelve al paso anterior y elige al menos una categoría para ver sus actividades." />
        </div>
      )}

      {categoriasSeleccionadas.map((categoria) => {
        const deCategoria = actividades.filter((actividad) => actividad.id_categoria === categoria.id);
        if (deCategoria.length === 0) return null;
        return (
          <fieldset key={categoria.id} className="mt-6">
            <legend className={`mb-3 text-sm font-black ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>{categoria.nombre}</legend>
            <div className="flex flex-wrap gap-2">
              {deCategoria.map((actividad) => (
                <TarjetaSeleccion
                  key={actividad.id}
                  id={`actividad-${actividad.id}`}
                  variante="chip"
                  seleccionada={seleccion.includes(actividad.id)}
                  onAlternar={() => onAlternar(actividad.id)}
                  titulo={actividad.nombre}
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="mt-8">
        <label htmlFor="propuesta-actividad" className={`block text-sm font-black ${modoOscuro ? 'text-slate-200' : 'text-slate-800'}`}>
          ¿Te gustaría proponer otra actividad?
        </label>
        <input
          id="propuesta-actividad"
          type="text"
          value={propuesta}
          maxLength={LONGITUD_PROPUESTA.max}
          onChange={(evento) => onCambiarPropuesta(evento.target.value)}
          placeholder="Ej. Club de robótica"
          aria-invalid={errorPropuesta ? 'true' : 'false'}
          aria-describedby={errorPropuesta ? idErrorPropuesta : undefined}
          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60 ${
            modoOscuro ? 'border-slate-700 bg-[#0e162c] text-white placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
          }`}
        />
        {errorPropuesta && (
          <p id={idErrorPropuesta} role="alert" className={`mt-2 text-sm ${modoOscuro ? 'text-red-400' : 'text-red-700'}`}>
            {errorPropuesta}
          </p>
        )}
      </div>
    </div>
  );
}
