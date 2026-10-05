// Vista previa de una encuesta: cómo la va a ver el alumno, sin poder mandarla.
//
// Reutiliza `CampoPregunta` en vez de reescribir los cinco campos. Es el mismo
// componente que pinta el formulario público, así que la vista previa no puede
// quedar desfasada del formulario real: si el campo cambia, cambia en los dos
// sitios. Lo único que se le añade es `disabled`, que el componente ya soportaba.
//
// Los datos salen de `GET /admin/:id` y no del endpoint público a propósito: el
// público sólo sirve encuestas publicadas (GET /publico/:slug filtra por estado),
// así que una encuesta en borrador no se podría previsualizar por ahí. Además el
// detalle trae lo que el público no expone, como el estado.
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { CampoTexto } from '../../ui/CampoTexto';
import { Icono } from '../../ui/Icono';
import { ModalBase } from '../../ui/ModalBase';
import { CampoPregunta } from '../../encuestas/CampoPregunta';
import { etiquetaTipoPregunta } from '../../../constants/encuesta';
import { infoEstadoEncuesta } from '../../../constants/estatus';
import { numerosVisibles } from '../../../utils/encuesta';

// `CampoPregunta` es controlado, así que hay que darle un `valor` aunque no se
// pueda cambiar. El valor de arranque de cada tipo está en el contrato del
// componente y basta uno solo: en solo lectura nada lo mueve, no hace falta
// estado. `licenciatura` arranca en null, que es su estado de "Prefiero no decir".
const VALOR_INICIAL = {
  opcion_unica: null,
  opcion_multiple: [],
  texto_corto: '',
  texto_largo: '',
  escala: null,
  licenciatura: null,
};

export function VistaPreviaEncuesta({
  encuesta,
  preguntas,
  onClose,
  cargando,
  error,
  onRecargar,
}) {
  const { cardCls, tema } = useTheme();

  const valorDe = (pregunta) => VALOR_INICIAL[pregunta.tipo] ?? null;

  // Se reutiliza el mismo helper que el formulario público, no una copia: la
  // vista previa existe para mostrar lo que va a ver el alumno, y dos
  // numeraciones distintas la convertirían en una pantalla que miente.
  const numeros = numerosVisibles(preguntas);

  const info = infoEstadoEncuesta(encuesta?.estado);

  return (
    <ModalBase show onClose={onClose} maxWidth="max-w-2xl" closeOnBackdrop={false}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Vista previa
        </h3>
        <Badge texto={info.etiqueta} color={info.color} />
      </div>

      {/* El aviso va primero y con el rótulo dentro porque es lo único que
          distingue esta pantalla del formulario real. Sin él, un admin podría
          creer que ya está contestando la encuesta y tomar los valores marcados
          por alguien más como respuestas reales. */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
        <Icono nombre="eye" className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-amber-400">
            Vista previa
          </p>
          <p className="text-xs mt-1">
            Así la verá el alumno, pero los campos están deshabilitados: no se puede
            contestar ni enviar nada desde aquí.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <h4 className={`text-base font-bold ${tema.title}`}>{encuesta?.titulo}</h4>
          {encuesta?.descripcion && (
            <p className={`text-sm mt-1 ${tema.subtitle}`}>{encuesta.descripcion}</p>
          )}
        </div>

        {cargando ? (
          <p className={`text-sm ${tema.subtitle}`}>Cargando las preguntas…</p>
        ) : error ? (
          // El error va dentro del modal a propósito: mandarlo al feedback del
          // panel lo pondría detrás del overlay, donde no se lee.
          <div className="space-y-3">
            <Alerta tipo="error" mensaje="No se pudieron cargar las preguntas.">
              <p className="text-xs mt-1 opacity-80">{error}</p>
            </Alerta>
            {onRecargar && (
              <button
                type="button"
                onClick={onRecargar}
                className="text-xs font-bold underline cursor-pointer"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : preguntas.length === 0 ? (
          <Alerta
            tipo="warning"
            mensaje="Esta encuesta todavía no tiene preguntas. Mientras esté vacía, el enlace público no muestra nada."
          />
        ) : (
          preguntas.map((pregunta, indice) => (
            <div key={pregunta.id_pregunta} className={`${cardCls} border rounded-xl p-4`}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {numeros[indice] !== null && (
                  <span className={`text-xs font-bold ${tema.subtitle}`}>
                    {numeros[indice]}.
                  </span>
                )}
                <p className={`text-sm font-semibold flex-1 min-w-0 ${tema.text}`}>
                  {pregunta.texto}
                </p>
                <Badge texto={etiquetaTipoPregunta(pregunta.tipo)} color="blue" />
                {pregunta.es_obligatoria && <Badge texto="Obligatoria" color="red" />}
              </div>

              {pregunta.ayuda && (
                <p className={`text-xs mb-3 ${tema.subtitle}`}>{pregunta.ayuda}</p>
              )}

              <CampoPregunta
                pregunta={pregunta}
                valor={valorDe(pregunta)}
                onChange={() => {}}
                deshabilitado
              />
            </div>
          ))
        )}

        {encuesta?.mensaje_agradecimiento && (
          <div>
            <p className={`text-xs mb-1 ${tema.subtitle}`}>
              Mensaje de agradecimiento (se ve al enviar)
            </p>
            {/* `disabled` y no `readOnly`: CampoTexto marca los `readOnly` como
                "Precargado", que es otra cosa. */}
            <CampoTexto value={encuesta.mensaje_agradecimiento} disabled />
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </ModalBase>
  );
}