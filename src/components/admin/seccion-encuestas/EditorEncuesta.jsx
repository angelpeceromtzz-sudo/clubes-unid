// Editor de los datos de la encuesta: título, descripción, mensaje de
// agradecimiento, estado y ventana de vigencia, más el enlace público y su QR.
//
// El enlace se muestra siempre, incluso en borrador. No es un descuido: el admin
// necesita poder mandárselo a alguien para probarlo antes de publicar, y la
// encuesta en borrador no responde (el backend sólo sirve `estado =
// 'publicada'`). Lo que cambia es la nota que lo acompaña.
//
// Va arriba, antes que los datos, porque es lo único que el admin copia en
// cuanto entra a editar. El aviso de que el enlace todavía no responde se queda
// abajo, junto al select de Estado, porque no es un problema del enlace sino del
// estado: es la misma decisión que produce el aviso.
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
import { enlacePublicoEncuesta } from '../../../utils/encuesta';
import { QrEncuesta } from './QrEncuesta';

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
  const { detalle, guardarMetadatos, enviando, esAdmin, setMetadatosSucios } = hook;

  const [borrador, setBorrador] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [verQr, setVerQr] = useState(false);

  // Instante de referencia para decidir si la fecha de cierre ya pasó.
  //
  // Va en estado y no como `Date.now()` en el render porque leer el reloj durante
  // el render es una impureza: dos renders del mismo estado pueden dar
  // resultados distintos y React lo marca como bug. Se captura al cargar el
  // detalle, así que si la encuesta vence con el panel abierto el aviso aparece
  // en la siguiente recarga, no al instante. Para un formulario que alguien
  // está mirando mientras decide, es suficiente.
  const [ahora, setAhora] = useState(null);

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
    setAhora(Date.now());
  }, [detalle]);

// Todo lo que sigue al `return <Spinner>` se calcula con `borrador` ya
  // garantizado, pero los hooks tienen que declararse ANTES de cualquier return
  // temprano: si el número de hooks cambia entre renders React lo toma como un
  // bug de orden. Por eso `cambiado` se calcula con optional chaining y el
  // `useEffect` va aquí arriba.
  const cambiado =
    borrador !== null &&
    (borrador.titulo !== (detalle?.titulo ?? '') ||
      borrador.descripcion !== (detalle?.descripcion ?? '') ||
      borrador.mensaje_agradecimiento !== (detalle?.mensaje_agradecimiento ?? '') ||
      borrador.estado !== detalle?.estado ||
      borrador.fecha_inicio !== aInputDateTime(detalle?.fecha_inicio) ||
      borrador.fecha_fin !== aInputDateTime(detalle?.fecha_fin));

  // El contenedor necesita saber si el formulario tiene cambios sin guardar
  // para poder preguntar antes de desmontarlo al cambiar de pestaña.
  useEffect(() => {
    setMetadatosSucios(cambiado);
  }, [cambiado, setMetadatosSucios]);

  if (!borrador || !detalle) return <Spinner size="md" />;

  // El enlace se arma en el helper compartido y no aquí: lo usan también el QR y
  // la lista, y tres copias de la misma concatenación es una forma segura de que
  // una quede apuntando a otra cosa el día que cambie el formato.
  const enlace = enlacePublicoEncuesta(detalle.slug);
  const info = infoEstadoEncuesta(detalle.estado);

  // El backend valida que el cierre sea posterior al inicio y devuelve un 400
  // legible. Aquí sólo se avisa antes, para no gastar el viaje si se puede.
  const fechasInvertidas =
    borrador.fecha_inicio && borrador.fecha_fin && borrador.fecha_fin <= borrador.fecha_inicio;

  // Publicar sin preguntas deja una encuesta que el alumno abre y no tiene nada
  // que contestar. El backend lo acepta (pendiente #4 de
  // docs/pbi-10-pendientes-backend.md), así que el bloqueo tiene que ser de
  // cliente, y en los dos puntos donde se puede llegar a publicarla: el <select>
  // (opción deshabilitada) y el guardado (botón bloqueado y `guardarMetadatos`
  // que se niega antes de gastar el viaje). Con esto, ninguna otra vía de
  // guardado que se agregue más adelante publica una encuesta vacía por descuido.
  const totalPreguntas = detalle.preguntas?.length ?? 0;
  const publicandoVacia = borrador.estado === 'publicada' && totalPreguntas === 0;

  // Reabrir una encuesta cerrada o vencida sin tocar `fecha_fin` deja el enlace
  // sirviendo un 410: el estado dice "publicada" pero el alumno lee "Esta
  // encuesta ya se cerró". Se pide una fecha nueva antes de guardar en vez de
  // dejar que el admin lo descubra cuando alguien abra el QR.
  //
  // El bloqueo es sólo para la reapertura. Una encuesta que ya está publicada y
  // venció sola por su `fecha_fin` se puede seguir editando --cambiarle el
  // título no vuelve a abrirla ni rompe nada--, así que no se obliga a mover la
  // fecha para poder guardar el texto.
  const fechaFinPasada =
    borrador.estado === ESTADO_ENCUESTA.PUBLICADA &&
    Boolean(borrador.fecha_fin) &&
    ahora !== null &&
    new Date(borrador.fecha_fin).getTime() < ahora;

  const reabriendoVencida =
    fechaFinPasada && borrador.estado !== (detalle.estado ?? borrador.estado);

  const bloqueado = publicandoVacia || reabriendoVencida;

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
    <div className="space-y-8">
      {/* Título de la encuesta en grande, como encabezado de documento. Es
          read-only a propósito: se edita en la sección de datos de abajo, que es
          la que tiene su botón de guardar y su validación de fechas. Duplicar el
          campo editable acá dejaría el título fuera del formulario que ya
          garantiza que se guarde. */}
      <header className="space-y-1.5">
        <div className="flex items-start gap-3 flex-wrap">
          <h2 className={`text-2xl font-black leading-tight ${tema.title}`}>
            {detalle.titulo}
          </h2>
          <Badge texto={info.etiqueta} color={info.color} />
        </div>
        {detalle.descripcion && (
          <p className={`text-sm ${tema.subtitle}`}>{detalle.descripcion}</p>
        )}
      </header>

      {/* --- enlace público --- */}
      <section className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider">Enlace público</h3>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            readOnly
            value={enlace}
            aria-label="Enlace público de la encuesta"
            className={`${inputCls} text-xs flex-1 min-w-0 cursor-text`}
            onFocus={(e) => e.target.select()}
          />
          <BotonAccion variant="outline" size="sm" onClick={copiar} disabled={enviando}>
            <Icono nombre={copiado ? 'check' : 'clipboard'} className="h-3.5 w-3.5" />
            {copiado ? 'Copiado' : 'Copiar'}
          </BotonAccion>
          <BotonAccion
            variant="outline"
            size="sm"
            onClick={() => setVerQr((v) => !v)}
            aria-expanded={verQr}
          >
            <Icono nombre="grid" className="h-3.5 w-3.5" />
            {verQr ? 'Ocultar QR' : 'QR'}
          </BotonAccion>
        </div>

        {verQr && (
          <QrEncuesta
            enlace={enlace}
            titulo={detalle.titulo}
            slug={detalle.slug}
          />
        )}
      </section>

      {/* --- datos de la encuesta --- */}
      <section className={`${cardCls} border rounded-2xl p-5 space-y-4`}>
        <h3 className="text-sm font-black uppercase tracking-wider">Datos de la encuesta</h3>

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

        <div>
          <CampoSelect
            label="Estado"
            name="estado"
            value={borrador.estado}
            onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
            opciones={ORDEN_ESTADO_ENCUESTA.map((valor) => ({
              value: valor,
              label: infoEstadoEncuesta(valor).etiqueta,
              // Sin preguntas no se puede publicar, y el bloqueo va también en
              // la opción para que el select no ofrezca algo que el botón de
              // guardar va a rechazar. La opción no se quita del select: si la
              // encuesta ya está publicada y vacía (el backend lo permite, ver
              // docs/pbi-10-pendientes-backend.md), tiene que seguir apareciendo
              // para poder volver a borrador.
              disabled: valor === ESTADO_ENCUESTA.PUBLICADA && totalPreguntas === 0,
            }))}
            // Rectoría no cambia el estado: el endpoint de escritura le devuelve
            // 403 y además no tiene ningún sentido que pueda cerrar una encuesta
            // desde su vista de lectura.
            disabled={enviando || !esAdmin}
          />

          {/* Por qué "Publicada" aparece apagada. Un <option disabled> sin
              explicación se lee como un select roto. */}
          {totalPreguntas === 0 && (
            <p className={`text-[11px] ${tema.subtitle} mt-1.5`}>
              No se puede publicar todavía: la encuesta no tiene preguntas.
            </p>
          )}

          {/* El aviso del enlace vive acá, no arriba: lo produce el estado, y
              arriba el enlace se lee como algo que ya funciona.

              Se lee de `detalle`, no de `borrador`, a propósito. El enlace
              responde según lo que está guardado en el servidor: si el admin
              elige "Publicada" y todavía no le dio guardar, el enlace sigue sin
              funcionar y el aviso tiene que seguir ahí. Si leyera del
              formulario, el aviso desaparecería antes de guardar y sería
              mentira. */}
          {detalle.estado !== ESTADO_ENCUESTA.PUBLICADA && (
            <p className={`text-[11px] ${tema.subtitle} mt-1.5`}>
              {detalle.estado === ESTADO_ENCUESTA.BORRADOR
                ? 'Mientras esté en borrador, quien abra el enlace no verá la encuesta.'
                : 'Al estar cerrada, el enlace ya no acepta respuestas.'}
            </p>
          )}

          {detalle.estado === ESTADO_ENCUESTA.PUBLICADA && (
            <p className={`text-[11px] ${tema.subtitle} mt-1.5`}>
              {borrador.estado !== detalle.estado
                ? 'Tienes un cambio de estado sin guardar. El enlace sigue como está en el servidor hasta que guardes.'
                : 'Mientras no tenga fecha de cierre, el enlace queda abierto. Si le pones una, el servidor pasa a contestar 410 al vencerse.'}
            </p>
          )}
        </div>

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

        {publicandoVacia && (
          <Alerta
            tipo="error"
            mensaje="No se puede publicar una encuesta sin preguntas."
          >
            <p className="text-xs mt-1">
              Quien abra el enlace vería una encuesta vacía. Agrega al menos una
              pregunta en la pestaña de Preguntas, o deja la encuesta en borrador.
            </p>
          </Alerta>
        )}

        {/* Aviso de guardado bloqueado: sólo cuando se está reabriendo. El texto
            dice qué hacer para desbloquear, porque si no parece un error del
            formulario. */}
        {reabriendoVencida && (
          <Alerta
            tipo="error"
            mensaje="Para reabrirla necesita una fecha de cierre futura."
          >
            <p className="text-xs mt-1">
              Si la dejas como está, el enlace seguirá diciendo que la encuesta se cerró
              aunque la marqué como publicada. Pon una fecha nueva o quita la de cierre
              para dejarla abierta.
            </p>
          </Alerta>
        )}

        {/* Ya publicada y vencida sola: se avisa pero no se bloquea, porque editar
            el texto de una encuesta vencida no la reabre ni la daña. */}
        {fechaFinPasada && !reabriendoVencida && (
          <Alerta
            tipo="warning"
            mensaje="La fecha de cierre ya pasó: el enlace público responde que la encuesta se cerró."
          >
            <p className="text-xs mt-1">
              Puedes seguir guardando cambios. Si quieres volver a recibir respuestas,
              quita la fecha de cierre para dejarla abierta sin fecha.
            </p>
          </Alerta>
        )}

        {/* El botón se esconde para rectoría en vez de deshabilitarse, como el resto de
            escrituras del panel: un "Guardar" visible que no guarda nunca es peor
            que no verlo. Los campos quedan igual porque esta vista es la única
            forma de leer los metadatos. */}
        {esAdmin ? (
          <div className="flex justify-end">
            <BotonAccion
              onClick={() => guardarMetadatos(borrador)}
              disabled={
                enviando ||
                !cambiado ||
                !borrador.titulo.trim() ||
                fechasInvertidas ||
                // El bloqueo va en el botón y no sólo en el aviso: el aviso
                // explica, el botón evita. Un aviso sin bloquear deja que el
                // backend acepte justo lo que acabamos de decir que no.
                bloqueado
              }
            >
              {enviando ? 'Guardando...' : 'Guardar cambios'}
            </BotonAccion>
          </div>
        ) : (
          <p className={`text-xs text-right ${tema.subtitle}`}>
            Sólo lectura: puedes consultar los datos pero no modificarlos.
          </p>
        )}
      </section>
    </div>
  );
}
