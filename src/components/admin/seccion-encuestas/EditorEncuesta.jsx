/* Datos que se editan en la pestaña de Preguntas: el título y la descripción.
 *
 * Antes estos campos vivían en una tarjeta de "Datos de la encuesta" junto con
 * el estado, las fechas y el mensaje de agradecimiento, con un botón de
 * guardar propio. Ahora el formulario está repartido por pestañas pero sigue
 * siendo uno solo (vive en el hook), así que estos dos campos y los de
 * Configuración se guardan con la misma acción, la de la barra de arriba.
 *
 * El título va como un campo grande y de lectura prioritaria, como el
 * encabezado de un documento: es lo primero que ve el alumno.
 */
import { useTheme } from '../../../contexts/ThemeContext';
import { CampoTexto } from '../../ui/CampoTexto';

export function EditorEncuesta({ hook }) {
  const { inputCls, tema } = useTheme();
  const { formEncuesta, actualizarFormulario, esAdmin, enviando } = hook;

  const soloLectura = !esAdmin;

  return (
    <section className="space-y-3" aria-labelledby="encabezado-encuesta">
      <h2 id="encabezado-encuesta" className={`text-xs font-bold uppercase tracking-widest ${tema.subtitle}`}>
        Encabezado de la encuesta
      </h2>

      <div>
        <label htmlFor="titulo" className="sr-only">
          Título de la encuesta
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          maxLength={200}
          value={formEncuesta.titulo}
          disabled={soloLectura || enviando}
          onChange={(e) => actualizarFormulario({ titulo: e.target.value })}
          placeholder="Intereses para clubes"
          className={`${inputCls} text-lg font-black`}
        />
      </div>

      <CampoTexto
        label="Descripción"
        name="descripcion"
        type="textarea"
        value={formEncuesta.descripcion}
        disabled={soloLectura || enviando}
        onChange={(e) => actualizarFormulario({ descripcion: e.target.value })}
        placeholder="Qué se le pregunta al alumno y para qué"
      />

      {soloLectura && (
        <p className={`text-[11px] ${tema.subtitle}`}>
          Sólo lectura: puedes consultar la encuesta, no modificarla.
        </p>
      )}
    </section>
  );
}
