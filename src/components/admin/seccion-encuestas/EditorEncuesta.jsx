// Editor de los datos de la encuesta: título, descripción, mensaje de
// agradecimiento, estado y ventana de vigencia, más el enlace público.
//
// El enlace se muestra siempre, incluso en borrador. No es un descuido: el admin
// necesita poder mandárselo a alguien para probarlo antes de publicar, y la
// encuesta en borrador no responde (el backend sólo sirve `estado =
// 'publicada'`). Lo que cambia es la nota que lo acompaña.
import { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { BotonAccion } from '../../ui/BotonAccion';
import { CampoSelect } from '../../ui/CampoSelect';
import { CampoTexto } from '../../ui/CampoTexto';
import { Icono } from '../../ui/Icono';
import { Spinner } from '../../ui/Spinner';
import { ESTADO_ENCUESTA, ORDEN_ESTADO_ENCUESTA, infoEstadoEncuesta } from '../../../constants/estatus';

// <input type="datetime-local"> quiere "YYYY-MM-DDTHH:mm" en hora local, no un
// ISO con Z. Sin esta conversión el input aparece vacío aunque la encuesta tenga
// fecha, que es el peor síntoma posible en un campo de formulario.
function aInputDateTime(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}` +
    `T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  );
}

export function EditorEncuesta({ hook }) {
  const { cardCls, tema, inputCls } = useTheme();
  const { detalle, guardarMetadatos, enviando } = hook;

  const [borrador, setBorrador] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // El formulario local se reinicia cada vez que llega el detalle del servidor,
  // para que guardar no deje el campo pegado con lo que se escribió la última vez.
  // Es un efecto a propósito (sincronizar con lo que llegó del servidor, no
  // derivar estado), igual que el de useSeccionEncuestas.
  useEffect(() => {
    if (!detalle) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBorrador({
      titulo: detalle.titulo ?? '',
      descripcion: detalle.descripcion ?? '',
      mensaje_agradecimiento: detalle.mensaje_agradecimiento ?? '',
      estado: detalle.estado,
      fecha_inicio: aInputDateTime(detalle.fecha_inicio),
      fecha_fin: aInputDateTime(detalle.fecha_fin),
    });
  }, [detalle]);

  if (!borrador) return <Spinner size="md" />;

  const cambiado =
    borrador.titulo !== (detalle.titulo ?? '') ||
    borrador.descripcion !== (detalle.descripcion ?? '') ||
    borrador.mensaje_agradecimiento !== (detalle.mensaje_agradecimiento ?? '') ||
    borrador.estado !== detalle.estado ||
    borrador.fecha_inicio !== aInputDateTime(detalle.fecha_inicio) ||
    borrador.fecha_fin !== aInputDateTime(detalle.fecha_fin);

  const enlace = `${window.location.origin}/encuesta/${detalle.slug}`;
  const info = infoEstadoEncuesta(detalle.estado);

  // El backend valida que el cierre sea posterior al inicio y devuelve un 400
  // legible. Aquí sólo se avisa antes, para no gastar el viaje si se puede.
  const fechasInvertidas =
    borrador.fecha_inicio && borrador.fecha_fin && borrador.fecha_fin <= borrador.fecha_inicio;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard falla sin https o sin permiso. No es motivo para romper la
      // pantalla: el enlace está en pantalla y se puede copiar a mano.
      setCopiado(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className={`${cardCls} border rounded-2xl p-5 space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider">Datos de la encuesta</h3>
          <Badge texto={info.etiqueta} color={info.color} />
        </div>

        <CampoTexto
          label="Título"
          name="titulo"
          value={borrador.titulo}
          onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
          required
          maxLength={200}
          disabled={enviando}
        />

        <CampoTexto
          label="Descripción"
          name="descripcion"
          type="textarea"
          value={borrador.descripcion}
          onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
          placeholder="Qué se le pregunta al alumno y para qué"
          disabled={enviando}
        />

        <CampoTexto
          label="Mensaje de agradecimiento"
          name="agradecimiento"
          type="textarea"
          value={borrador.mensaje_agradecimiento}
          onChange={(e) =>
            setBorrador({ ...borrador, mensaje_agradecimiento: e.target.value })
          }
          placeholder="Lo que ve el alumno al terminar"
          maxLength={300}
          disabled={enviando}
        />

        <CampoSelect
          label="Estado"
          name="estado"
          value={borrador.estado}
          onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
          opciones={ORDEN_ESTADO_ENCUESTA.map((valor) => ({
            value: valor,
            label: infoEstadoEncuesta(valor).etiqueta,
          }))}
          disabled={enviando}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CampoTexto
            label="Abre (opcional)"
            name="fecha-inicio"
            type="datetime-local"
            value={borrador.fecha_inicio}
            onChange={(e) => setBorrador({ ...borrador, fecha_inicio: e.target.value })}
            disabled={enviando}
          />
          <CampoTexto
            label="Cierra (opcional)"
            name="fecha-fin"
            type="datetime-local"
            value={borrador.fecha_fin}
            onChange={(e) => setBorrador({ ...borrador, fecha_fin: e.target.value })}
            disabled={enviando}
          />
        </div>

        {fechasInvertidas && (
          <Alerta tipo="error" mensaje="La fecha de cierre debe ser posterior a la de apertura." />
        )}

        <div className="flex justify-end">
          <BotonAccion
            onClick={guardarMetadatos}
            disabled={enviando || !cambiado || !borrador.titulo.trim() || fechasInvertidas}
          >
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </BotonAccion>
        </div>
      </section>

      <section className={`${cardCls} border rounded-2xl p-5 space-y-3`}>
        <h3 className="text-sm font-black uppercase tracking-wider">Enlace público</h3>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={enlace}
            aria-label="Enlace público de la encuesta"
            className={`${inputCls} text-xs flex-1 cursor-text`}
            onFocus={(e) => e.target.select()}
          />
          <BotonAccion variant="outline" size="sm" onClick={copiar} disabled={enviando}>
            <Icono nombre={copiado ? 'check' : 'clipboard'} className="h-3.5 w-3.5" />
            {copiado ? 'Copiado' : 'Copiar'}
          </BotonAccion>
        </div>

        {detalle.estado !== ESTADO_ENCUESTA.PUBLICADA && (
          <Alerta
            tipo="warning"
            mensaje={
              detalle.estado === ESTADO_ENCUESTA.BORRADOR
                ? 'La encuesta está en borrador: quien abra el enlace no verá la encuesta.'
                : 'La encuesta está cerrada: el enlace ya no acepta respuestas.'
            }
          />
        )}

        {detalle.estado === ESTADO_ENCUESTA.PUBLICADA && (
          <p className={`text-[11px] ${tema.subtitle}`}>
            Mientras no tenga fecha de cierre, el enlace queda abierto. Si le pones una, el
            servidor pasa a contestar 410 al vencerse.
          </p>
        )}
      </section>
    </div>
  );
}
