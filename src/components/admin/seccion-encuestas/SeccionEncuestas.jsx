// Sección de encuestas del panel de administración.
//
// Es el contenedor de la sección y decide cuál de las tres pantallas se muestra:
// lista, editor o resultados. El estado vive en useSeccionEncuestas.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { BotonAccion } from '../../ui/BotonAccion';
import { CampoSelect } from '../../ui/CampoSelect';
import { CampoTexto } from '../../ui/CampoTexto';
import { EmptyState } from '../../ui/EmptyState';
import { EncabezadoPagina } from '../../ui/EncabezadoPagina';
import { Icono } from '../../ui/Icono';
import { ModalBase } from '../../ui/ModalBase';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { Spinner } from '../../ui/Spinner';
import { ORDEN_ESTADO_ENCUESTA, infoEstadoEncuesta } from '../../../constants/estatus';
import {
  enlacePublicoEncuesta,
  enlacePublicoUtilizable,
  textoVigenciaEncuesta,
} from '../../../utils/encuesta';
import { useSeccionEncuestas } from '../../../hooks/useSeccionEncuestas';
import { useDetalleEncuesta } from '../../../hooks/useDetalleEncuesta';
import { BarraEditorEncuesta } from './BarraEditorEncuesta';
import { ConfiguracionEncuesta } from './ConfiguracionEncuesta';
import { EditorEncuesta } from './EditorEncuesta';
import { EditorPreguntas } from './EditorPreguntas';
import { PanelResultados } from './PanelResultados';
import { PestanasEncuesta } from './PestanasEncuesta';
import { MenuAcciones } from './MenuAcciones';
import { VistaPreviaEncuesta } from './VistaPreviaEncuesta';

// --- acciones de la fila ---------------------------------------------------

/**
 * Qué acciones existen para una encuesta y en qué presentación.
 *
 * Vive fuera del componente porque son reglas, no marcado: las dos
 * presentaciones de la fila (ancha y angosta) tienen que mostrar exactamente lo
 * mismo. Si se escribieran dentro del JSX, cualquier cambio en una se olvidaría
 * de la otra y aparecería el bug clásico de "en móvil está Cerrar y en
 * escritorio no".
 *
 * Tres grupos porque tienen tres tratamientos:
 *   principales  → botón de acento, primero.
 *   secundarias  → estilo secundario, en orden fijo.
 *   peligrosas   → estilo de peligro, al final y separadas.
 */
function accionesDeEncuesta({
  encuesta,
  esAdmin,
  tieneRespuestas,
  setViendoPrevia,
  setCerrando,
  setBorrando,
  abrirEditor,
  abrirResultados,
  copiarEnlace,
}) {
  const principales = [];

  // Resultados es la acción principal y sólo tiene sentido si hay algo que ver.
  // Con cero respuestas la vista viene toda en cero.
  if (tieneRespuestas) {
    principales.push(
      <BotonAccion
        key="resultados"
        size="sm"
        onClick={() => abrirResultados(encuesta)}
        aria-label={`Ver resultados de ${encuesta.titulo}`}
      >
        <Icono nombre="chart-bar" className="h-3.5 w-3.5" />
        Resultados
      </BotonAccion>
    );
  }

  const secundarias = [];

  // Editar es escritura. Sigue apareciendo aunque haya respuestas porque es la
  // forma de cambiar título, descripción y fechas; lo que se congela con
  // respuestas es la estructura, y eso lo controla el editor.
  if (esAdmin) {
    secundarias.push({
      clave: 'editar',
      icono: 'pencil',
      texto: 'Editar',
      onClick: () => abrirEditor(encuesta),
    });
  }

  // Las siguientes son de lectura y se ven igual para los dos roles.
  secundarias.push({
    clave: 'previa',
    icono: 'eye',
    texto: 'Vista previa',
    onClick: () => setViendoPrevia(encuesta),
  });

  // El enlace de un borrador o de una cerrada no abre nada: el backend sólo
  // sirve estado publicada. Copiarlo ahí haría pensar que ya se puede repartir.
  if (enlacePublicoUtilizable(encuesta)) {
    secundarias.push({
      clave: 'copiar',
      icono: 'link',
      texto: 'Copiar enlace',
      onClick: () => copiarEnlace(encuesta),
    });
  }

  if (esAdmin) {
    // Cerrar sustituye a eliminar cuando hay respuestas en publicada/cerrada:
    // es lo único que el backend deja hacer. Sólo si está abierta.
    if (encuesta.estado === 'publicada') {
      secundarias.push({
        clave: 'cerrar',
        icono: 'lock',
        texto: 'Cerrar',
        onClick: () => setCerrando(encuesta),
      });
    }
  }

  // Borrar: sin respuestas siempre; en borrador también aunque las tenga,
  // porque el backend descarta las respuestas de un borrador antes de borrarlo
  // (residuos de prueba: un borrador no recibe respuestas por su enlace). Con
  // respuestas fuera de un borrador el botón no aparece en vez de fallar.
  const peligrosas = [];

  if (esAdmin && (encuesta.estado === 'borrador' || !tieneRespuestas)) {
    peligrosas.push({
      clave: 'eliminar',
      icono: 'trash',
      texto: 'Eliminar',
      onClick: () => setBorrando(encuesta),
      peligro: true,
    });
  }

  return { principales, secundarias, peligrosas };
}

// --- lista ---------------------------------------------------------------

function ListaEncuestas({ hook }) {
  const { cardCls, tema } = useTheme();
  const {
    lista, totalLista, filtro, setFiltro, cargandoLista, errorLista, cargarLista,
    abrirEditor, abrirResultados, eliminar, aplicarEstado, enviando, esAdmin,
    formNueva, setFormNueva, crear,
  } = hook;

  const [creando, setCreando] = useState(false);
  const [borrando, setBorrando] = useState(null);
  const [cerrando, setCerrando] = useState(null);
  const [viendoPrevia, setViendoPrevia] = useState(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  // Una encuesta con respuestas fuera de un borrador no se borra: se cierra.
  // La decisión se toma acá para que el botón ni aparezca, y `eliminar` vuelve
  // a comprobarla en el hook por si se dispara por otra vía.
  const conRespuestas = (e) => e.total_respuestas > 0;

  const copiarEnlace = async (encuesta) => {
    try {
      await navigator.clipboard.writeText(enlacePublicoEncuesta(encuesta.slug));
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      // Sin https o sin permiso el portapapeles falla. No vale la pena romper la
      // pantalla por eso: el enlace se puede copiar a mano desde el editor.
      setEnlaceCopiado(false);
    }
  };

  if (cargandoLista) return <Spinner size="md" />;

  if (errorLista) {
    return (
      <div className="space-y-3">
        <Alerta tipo="error" mensaje={`No se pudo cargar la lista: ${errorLista}`} />
        <BotonAccion variant="outline" size="sm" onClick={cargarLista}>
          Reintentar
        </BotonAccion>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EncabezadoPagina
        titulo="Encuestas"
        subtitulo="Diagnóstico de intereses de los alumnos. El enlace es público y no pide sesión."
        accion={
          esAdmin && (
            <BotonAccion onClick={() => setCreando(true)} disabled={enviando} className="px-8">
              <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
              Nueva
            </BotonAccion>
          )
        }
      />

      {enlaceCopiado && (
        // Aviso propio y no el feedback del panel: aquel se limpia solo a los
        // 4s y lo comparten todas las secciones.
        <Alerta tipo="success" mensaje="Enlace copiado al portapapeles" />
      )}

      {totalLista > 0 && (
        <div className="flex items-end gap-3 max-w-xs">
          <CampoSelect
            label="Estado"
            name="filtro-estado"
            value={filtro ?? ''}
            onChange={(e) => setFiltro(e.target.value || null)}
            opciones={[
              { value: '', label: 'Todas' },
              ...ORDEN_ESTADO_ENCUESTA.map((valor) => ({
                value: valor,
                label: infoEstadoEncuesta(valor).etiqueta,
              })),
            ]}
          />
        </div>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icono="clipboard"
          titulo={totalLista === 0 ? 'Todavía no hay encuestas' : 'Ninguna con ese estado'}
          descripcion={
            totalLista === 0
              ? esAdmin
                ? 'Crea la primera para empezar a preguntar.'
                : 'No hay ninguna encuesta todavía.'
              : 'Cambia el filtro o crea una nueva.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {lista.map((encuesta) => {
            const info = infoEstadoEncuesta(encuesta.estado);
            const tieneRespuestas = conRespuestas(encuesta);

            // Las acciones se arman una sola vez por fila y las dos
            // presentaciones (ancha y angosta) leen de aquí. Las reglas de
            // cuáles aparecen son las mismas de antes: sólo cambió cómo se
            // ven.
            const acciones = accionesDeEncuesta({
              encuesta,
              esAdmin,
              tieneRespuestas,
              setViendoPrevia,
              setCerrando,
              setBorrando,
              abrirEditor,
              abrirResultados,
              copiarEnlace,
            });

            return (
              <li
                key={encuesta.id_encuesta}
                className={`${cardCls} border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:gap-4`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold break-words">{encuesta.titulo}</p>
                    <Badge texto={info.etiqueta} color={info.color} />
                  </div>

                  <p className={`text-[11px] mt-1 ${tema.subtitle}`}>
                    {/* Vigencia primero: es lo que el admin necesita ver de un
                        vistazo para saber si todavía le sirve de algo. */}
                    <span className="opacity-70">{textoVigenciaEncuesta(encuesta)}</span>
                    {' · '}
                    {encuesta.total_preguntas}{' '}
                    {encuesta.total_preguntas === 1 ? 'pregunta' : 'preguntas'}
                    {' · '}
                    {encuesta.total_respuestas}{' '}
                    {encuesta.total_respuestas === 1 ? 'respuesta' : 'respuestas'}
                  </p>
                </div>

                {/* Las acciones van con texto, no sólo con icono: con iconos, "Editar" y
                    "Cerrar" se confundían entre sí porque ambos son un recuadro
                    con un dibujito y nada más los distingue.

                    Dos presentations del mismo conjunto:
                    - `hidden lg:flex`: en escritorio, todas en línea.
                    - `lg:hidden`: en angosto, sólo las dos más usadas y el resto
                      en el menú "Más".

                    Las reglas de WHICH aparecen NO cambian: se arman una sola vez
                    en `acciones` y las dos presentaciones la consumen. Así no
                    puede pasar que en móvil aparezca algo que en escritorio no. */}
                <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:justify-end">
                  <div className="hidden lg:flex items-center gap-2 flex-wrap lg:justify-end">
                    {acciones.principales}
                    {acciones.secundarias.map((accion) => (
                      <BotonAccion
                        key={accion.clave}
                        variant="outline"
                        size="sm"
                        onClick={accion.onClick}
                        disabled={enviando}
                      >
                        <Icono nombre={accion.icono} className="h-3.5 w-3.5" />
                        {accion.texto}
                      </BotonAccion>
                    ))}
                    {acciones.peligrosas.map((accion) => (
                      <BotonAccion
                        key={accion.clave}
                        variant="danger"
                        size="sm"
                        onClick={accion.onClick}
                        disabled={enviando}
                      >
                        <Icono nombre={accion.icono} className="h-3.5 w-3.5" />
                        {accion.texto}
                      </BotonAccion>
                    ))}
                  </div>

                  {/* En angosto se reducen a Resultados y "Más". El resto queda
                      accesible con un toque, que es lo que hace falta en un
                      teléfono; meterse a una lista horizontal para cerrar una
                      encuesta no es un recorrido que alguien vaya a hacer. */}
                  <div className="flex items-center gap-2 sm:gap-1.5 lg:hidden">
                    {acciones.principales}
                    {acciones.secundarias.length > 0 && (
                      <MenuAcciones
                        items={[...acciones.secundarias, ...acciones.peligrosas]}
                        deshabilitado={enviando}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viendoPrevia && (
        <VistaPreviaCargando
          encuesta={viendoPrevia}
          onCerrar={() => setViendoPrevia(null)}
        />
      )}

      {/* --- alta --- */}
      <ModalBase
        show={creando}
        onClose={() => setCreando(false)}
        maxWidth="max-w-lg"
        closeOnBackdrop={false}
      >
        <h3 className={`text-lg font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Nueva encuesta
        </h3>
        <p className={`text-xs mb-5 ${tema.subtitle}`}>
          Nace en borrador y con el enlace ya generado. Las preguntas se agregan en el
          siguiente paso.
        </p>

        <div className="space-y-4">
          <CampoTexto
            label="Título"
            name="titulo-nueva"
            value={formNueva.titulo}
            onChange={(e) => setFormNueva({ ...formNueva, titulo: e.target.value })}
            placeholder="Intereses para clubes"
            required
            maxLength={200}
            disabled={enviando}
          />

          <CampoTexto
            label="Descripción (opcional)"
            name="descripcion-nueva"
            type="textarea"
            value={formNueva.descripcion}
            onChange={(e) => setFormNueva({ ...formNueva, descripcion: e.target.value })}
            placeholder="Qué se le va a preguntar"
            disabled={enviando}
          />

          <div className="grid grid-cols-2 gap-3">
            <CampoTexto
              label="Abre (opcional)"
              name="inicio-nueva"
              type="datetime-local"
              value={formNueva.fecha_inicio}
              onChange={(e) => setFormNueva({ ...formNueva, fecha_inicio: e.target.value })}
              disabled={enviando}
            />
            <CampoTexto
              label="Cierra (opcional)"
              name="fin-nueva"
              type="datetime-local"
              value={formNueva.fecha_fin}
              onChange={(e) => setFormNueva({ ...formNueva, fecha_fin: e.target.value })}
              disabled={enviando}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <BotonAccion variant="outline" onClick={() => setCreando(false)} disabled={enviando}>
            Cancelar
          </BotonAccion>
          <BotonAccion
            onClick={async () => {
              const creada = await crear();
              if (creada) setCreando(false);
            }}
            disabled={enviando || !formNueva.titulo.trim()}
          >
            {enviando ? 'Creando...' : 'Crear'}
          </BotonAccion>
        </div>
      </ModalBase>

      {/* --- baja --- */}
      {/* El botón de eliminar sólo aparece sin respuestas o en borrador; el
          mensaje de abajo refleja ambos casos. */}
      <ModalConfirmacion
        show={Boolean(borrando)}
        titulo="Eliminar encuesta"
        mensaje={
          borrando
            ? `Se eliminará "${borrando.titulo}" con sus ${borrando.total_preguntas} ${
                borrando.total_preguntas === 1 ? 'pregunta' : 'preguntas'
              }.${
                borrando.estado === 'borrador' && borrando.total_respuestas > 0
                  ? ` Sus ${borrando.total_respuestas} ${
                      borrando.total_respuestas === 1 ? 'respuesta' : 'respuestas'
                    } anónimas también se descartarán.`
                  : ' No tiene respuestas, así que se puede borrar sin dejar nada atrás.'
              }`
            : ''
        }
        textoConfirmar="Eliminar"
        varianteDanger
        cargando={enviando}
        onConfirmar={async () => {
          setBorrando(null);
          await eliminar(borrando.id_encuesta);
        }}
        onCancelar={() => setBorrando(null)}
      />

      {/* --- cierre --- */}
      {/* Cerrar pide confirmación porque el enlace público ya está repartido:
          quien lo tenga abierto dejará de poder contestar. No es irreversible --
          el editor permite volver a "Publicada" -- pero la única forma de
          reabrir es abrir la encuesta y cambiar el estado, así que desde la
          lista este botón parece de un solo sentido y conviene que el admin lo
          sepa antes de pulsarlo. */}
      <ModalConfirmacion
        show={Boolean(cerrando)}
        titulo="Cerrar encuesta"
        mensaje={
          cerrando
            ? `Al cerrar "${cerrando.titulo}" el enlace público dejará de recibir respuestas. Quien ya lo tenga abierto no podrá mandar la suya${
                cerrando.total_respuestas > 0
                  ? `, y se conservarán las ${cerrando.total_respuestas} respuestas que ya hay`
                  : ''
              }. Si te equivocaste, puedes reabrirla desde el editor cambiando el estado a Publicada.`
            : ''
        }
        textoConfirmar="Cerrar encuesta"
        cargando={enviando}
        onConfirmar={async () => {
          const id = cerrando.id_encuesta;
          setCerrando(null);
          await aplicarEstado(id, 'cerrada');
        }}
        onCancelar={() => setCerrando(null)}
      />

      <p className={`text-[11px] ${tema.subtitle}`}>
        <span className="opacity-70">Las respuestas son anónimas por diseño:</span> la encuesta
        no guarda nombre ni matrícula, sólo el programa que el alumno elige. Por eso una
        encuesta con respuestas sólo se puede borrar si está en borrador — ahí sus respuestas
        se descartan —; en las demás no, sólo cerrar.
      </p>
    </div>
  );
}

// Carga el detalle de la encuesta que se está previsualizando.
//
// Va en su propio componente porque la vista previa necesita los datos de una
// encuesta distinta a la que está abierta en el editor. Si reutilizara
// `detalle` del hook tendría que abrir el editor para ver el borrador, y eso
// arrastra el formulario editable, la lista de preguntas y los modales con él.
function VistaPreviaCargando({ encuesta, onCerrar }) {
  const { detalle, cargando, error, recargar } = useDetalleEncuesta(encuesta.id_encuesta);

  return (
    <VistaPreviaEncuesta
      encuesta={detalle ?? encuesta}
      preguntas={detalle?.preguntas ?? []}
      cargando={cargando}
      error={error}
      onRecargar={recargar}
      onClose={onCerrar}
    />
  );
}

export function SeccionEncuestas({ d }) {
  // `d.user` lo expone usePanelAdmin. Va al hook porque es el que decide si el
  // panel muestra o esconde los botones de escritura: rectoría entra al panel
  // pero de encuestas sólo puede leer.
  const hook = useSeccionEncuestas(d?.setFeedback, d?.user);

  // El tema decide la barra de scroll del área de contenido (oscura sobre el
  // fondo azul noche, ámbar en el tema claro).
  const { tema } = useTheme();

  // Diálogo de confirmación al salir del editor con algo sin guardar.
  const [salirConPendientes, setSalirConPendientes] = useState(false);

  // El editor es un panel con su propio alto: la barra de arriba se queda
  // siempre visible y el contenido de la pestaña se recorre dentro. El alto se
  // mide contra la ventana para que el panel ocupe lo que queda debajo de la
  // navbar y del encabezado del panel de administración.
  //
  // `medidas` arranca en `null` a propósito: en el primer render el panel se
  // pinta con un alto provisional y el `useLayoutEffect` lo corrige antes de
  // que el navegador llegue a pintar. Si el primer render usara ya el alto
  // definitivo, el documento sería más alto que la ventana durante un
  // instante, y cualquier `scrollIntoView` (por ejemplo, el que deja el foco
  // en la pregunta recién guardada) desplazaría la página y se llevaría la
  // barra contextual fuera de la vista.
  const refPanel = useRef(null);
  const [medidas, setMedidas] = useState(null);

  useLayoutEffect(() => {
    const el = refPanel.current;
    if (!el) return undefined;

    const medir = () => {
      const arriba = el.getBoundingClientRect().top + window.scrollY;
      // En móvil la navegación inferior del sistema ocupa la parte baja de la
      // pantalla: se le deja su sitio para que la última fila de la lista no
      // quede debajo de ella.
      const margen = window.innerWidth >= 1024 ? 0 : 64;

      setMedidas((anterior) =>
        anterior && anterior.arriba === arriba && anterior.margen === margen
          ? anterior
          : { arriba, margen }
      );
    };

    medir();
    window.addEventListener('resize', medir);

    // Se observa el cuerpo y no sólo el padre del panel: el aviso de éxito del
    // panel (por ejemplo, "Pregunta agregada") aparece por encima del editor y
    // lo baja. Si no se midiera de nuevo, el panel quedaría más alto que la
    // ventana y la página podría desplazarse, llevándose la barra contextual
    // fuera de la vista.
    const observador = new ResizeObserver(medir);
    observador.observe(document.body);
    if (el.parentElement) observador.observe(el.parentElement);

    return () => {
      window.removeEventListener('resize', medir);
      observador.disconnect();
    };
    // La medición se hace cuando se abre el editor: antes de eso el panel no
    // existe y no hay nada que medir.
  }, [hook.vista]);

  // Mientras el editor está abierto, el contenido de la pestaña se recorre
  // dentro del panel (el div con `overflow-y-auto`) y no en la página. Para que
  // el desplazamiento no se encadene hacia la ventana --y con ella se mueva la
  // barra contextual-- el contenedor usa `overscroll-contain`, y por eso no
  // hace falta bloquear el scroll global: la ventana puede desplazarse (el
  // espacio que deja el panel del admin por debajo) sin que eso arrastre la
  // barra.

  // Aviso al intentar cerrar la pestaña con cambios sin guardar. Es el aviso
  // estándar del navegador: no se puede garantizar que el admin lo lea, pero
  // es la única red de seguridad que no depende de que pase por un botón.
  useEffect(() => {
    const hayPendientes = hook.formularioSucio || hook.edicionPendiente;
    if (!hayPendientes) return undefined;

    const alCerrar = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', alCerrar);
    return () => window.removeEventListener('beforeunload', alCerrar);
  }, [hook.formularioSucio, hook.edicionPendiente]);

  // Volver al listado pide confirmación si hay algo a medias. Cambiar de
  // pestaña no: el formulario vive en el hook y el modal de pregunta también,
  // así que nada de lo escrito se pierde al cambiar de vista.
  const pedirVolver = () => {
    if (hook.formularioSucio || hook.edicionPendiente) {
      setSalirConPendientes(true);
      return;
    }

    hook.volverALista();
  };

  if (hook.vista === 'editor' || hook.vista === 'resultados') {
    return (
      <div className="space-y-4">
        <div
          ref={refPanel}
          // Sin `border`: el marco exterior del editor salía en el color de
          // texto heredado (el preflight de Tailwind deja `border-color` en
          // `currentColor`) y quedaba una línea clara rodeando la barra, las
          // pestañas y el contenido. Los bordes internos de la barra, de las
          // herramientas y de las tarjetas se conservan.
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            // `dvh` y no `vh`: en móvil el alto útil cambia cuando la barra del
            // navegador se esconde, y con `vh` el panel quedaría más alto que la
            // pantalla.
            //
            // El alto se calcula, no se fija: es el espacio que queda entre el
            // borde superior del panel y el final de la ventana, menos el hueco
            // que ocupa la navegación inferior del sistema en móvil. El suelo
            // es pequeño a propósito: con un suelo alto, en una ventana baja el
            // panel se saldría de la pantalla y su parte final quedaría
            // inalcanzable. El contenido, en cualquier caso, se recorre dentro
            // del panel.
            height: medidas
              ? `max(140px, calc(100dvh - ${medidas.arriba}px - ${medidas.margen}px))`
              : '140px',
          }}
        >
          <BarraEditorEncuesta hook={hook} onVolver={pedirVolver} />

          {/* Las pestañas van siempre, incluso sin respuestas: entrar y ver que
              no hay nada todavía es una respuesta válida, y esconder la pestaña
              sólo cuando hay datos hace que la encuesta parezca cambiar de
              forma al llegar la primera respuesta. */}
          <div className="shrink-0 px-2 sm:px-5">
            <PestanasEncuesta
              pestanas={[
                { clave: 'preguntas', etiqueta: 'Preguntas' },
                { clave: 'resultados', etiqueta: 'Resultados' },
                { clave: 'configuracion', etiqueta: 'Configuración' },
              ]}
              activa={hook.pestana}
              onCambio={hook.cambiarPestana}
            />
          </div>

          {/* El contenido de la pestaña se recorre aquí dentro: es el contenedor
              real de scroll del editor, y la barra de arriba queda fuera para
              que nunca tape un error ni un control enfocado.

              `min-h-0` es lo que permite que esta zona se encoja dentro de la
              columna flex: sin él, el tamaño mínimo automático del elemento
              sería su contenido y el panel se saldría de su caja en vez de
              quedarse con scroll propio. `overscroll-contain` evita que al
              llegar al final el desplazamiento se encadene a la ventana.

              La barra de scroll es la del sistema: `scrollbar-dark` sobre el
              fondo azul noche del panel y `scrollbar-amber` en el tema claro.
              Son las dos clases que ya usa el proyecto (la primera en los
              paneles oscuros, la segunda en las superficies con ambos temas);
              no hace falta ninguna regla nueva ni esconder la barra. */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 ${
              tema.isDark ? 'scrollbar-dark' : 'scrollbar-amber'
            }`}
          >
            {hook.errorFeedback && <Alerta tipo="error" mensaje={hook.errorFeedback} />}

            {hook.cargandoDetalle ? (
              <Spinner size="md" />
            ) : !hook.detalle ? (
              <Alerta
                tipo="error"
                mensaje="No se pudo cargar la encuesta. Vuelve al listado e inténtalo otra vez."
              />
            ) : (
              <>
                {hook.pestana === 'preguntas' && (
                  <div
                    id="panel-preguntas"
                    role="tabpanel"
                    aria-labelledby="pestana-preguntas"
                    className="space-y-8"
                  >
                    <EditorEncuesta hook={hook} />
                    <EditorPreguntas hook={hook} />
                  </div>
                )}

                {hook.pestana === 'configuracion' && (
                  <div
                    id="panel-configuracion"
                    role="tabpanel"
                    aria-labelledby="pestana-configuracion"
                  >
                    <ConfiguracionEncuesta hook={hook} />
                  </div>
                )}

                {hook.pestana === 'resultados' && (
                  <div
                    id="panel-resultados"
                    role="tabpanel"
                    aria-labelledby="pestana-resultados"
                  >
                    <PanelResultados
                      hook={hook}
                      cargando={hook.cargandoResultados}
                      resultados={hook.resultados}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <ModalConfirmacion
          show={salirConPendientes}
          titulo="Hay cambios sin guardar"
          mensaje="Lo que escribiste se perderá si sales del editor. Puedes quedarte aquí y guardarlo antes."
          textoConfirmar="Descartar y salir"
          textoCancelar="Quedarme aquí"
          varianteDanger
          onConfirmar={() => {
            setSalirConPendientes(false);
            hook.volverALista();
          }}
          onCancelar={() => setSalirConPendientes(false)}
        />
      </div>
    );
  }

  return <ListaEncuestas hook={hook} />;
}
