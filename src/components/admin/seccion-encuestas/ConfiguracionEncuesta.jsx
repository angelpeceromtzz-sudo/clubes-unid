/* Ajustes de la encuesta que no son preguntas: mensaje de agradecimiento y
 * ventana de vigencia.
 *
 * Va en su propia pestaña (Configuración) para que la de Preguntas sea sólo
 * sobre preguntas y la barra de arriba no mezcle "editar el mensaje de
 * agradecimiento" con "publicar".
 *
 * El estado de la encuesta NO está aquí: cambiarlo es una acción de la barra
 * contextual (Publicar, Cerrar encuesta, Reabrir encuesta y Volver a borrador
 * en su menú). Tenerlo aquí duplicaba las acciones y daba dos caminos para
 * cambiar lo mismo, con el riesgo de que el selector mostrara un estado que el
 * servidor todavía no había confirmado.
 *
 * El formulario es el mismo que está en el hook: lo que se escribe aquí se
 * guarda con la acción de la barra, igual que el título de la pestaña de
 * Preguntas.
 */
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { CampoTexto } from '../../ui/CampoTexto';

export function ConfiguracionEncuesta({ hook }) {
  const { tema } = useTheme();
  const { formEncuesta, actualizarFormulario, esAdmin, enviando } = hook;

  const soloLectura = !esAdmin;

  const fechasInvertidas =
    formEncuesta.fecha_inicio &&
    formEncuesta.fecha_fin &&
    formEncuesta.fecha_fin <= formEncuesta.fecha_inicio;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <CampoTexto
          label="Mensaje de agradecimiento"
          name="agradecimiento"
          type="textarea"
          value={formEncuesta.mensaje_agradecimiento}
          disabled={soloLectura || enviando}
          onChange={(e) =>
            actualizarFormulario({ mensaje_agradecimiento: e.target.value })
          }
          placeholder="Lo que ve el alumno al terminar"
          maxLength={300}
        />

        <p className={`text-[11px] ${tema.subtitle}`}>
          Se muestra en la pantalla de gracias, después de enviar las respuestas.
          Si lo dejas vacío, el alumno ve «¡Gracias por responder!».
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Vigencia
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CampoTexto
            label="Abre (opcional)"
            name="fecha-inicio"
            type="datetime-local"
            value={formEncuesta.fecha_inicio}
            disabled={soloLectura || enviando}
            onChange={(e) => actualizarFormulario({ fecha_inicio: e.target.value })}
          />
          <CampoTexto
            label="Cierra (opcional)"
            name="fecha-fin"
            type="datetime-local"
            value={formEncuesta.fecha_fin}
            disabled={soloLectura || enviando}
            onChange={(e) => actualizarFormulario({ fecha_fin: e.target.value })}
          />
        </div>

        {fechasInvertidas && (
          <Alerta tipo="error" mensaje="La fecha de cierre debe ser posterior a la de apertura." />
        )}

        <p className={`text-[11px] ${tema.subtitle}`}>
          Sin fechas la encuesta queda abierta mientras esté publicada. Con una
          fecha de apertura futura el enlace dice que todavía no está disponible;
          con una de cierre pasada dice que la encuesta se cerró.
        </p>
      </section>
    </div>
  );
}
