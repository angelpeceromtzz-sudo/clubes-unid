// Sección de encuestas del panel de administración.
//
// Es el contenedor de la sección y decide cuál de las tres pantallas se muestra:
// lista, editor o resultados. El estado vive en useSeccionEncuestas.
import { useState } from 'react';
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
import { useSeccionEncuestas } from '../../../hooks/useSeccionEncuestas';
import { EditorEncuesta } from './EditorEncuesta';
import { EditorPreguntas } from './EditorPreguntas';
import { PanelResultados } from './PanelResultados';

function BotonIcono({ icono, titulo, onClick, danger, disabled }) {  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
          : 'opacity-60 hover:opacity-100 hover:bg-amber-400/10'
      }`}
    >
      <Icono nombre={icono} className="h-4 w-4" />
    </button>
  );
}

// --- lista ---------------------------------------------------------------

function ListaEncuestas({ hook }) {
  const { cardCls, tema } = useTheme();
  const {
    lista, totalLista, filtro, setFiltro, cargandoLista, errorLista, cargarLista,
    abrirEditor, abrirResultados, eliminar, enviando, formNueva, setFormNueva, crear,
  } = hook;

  const [creando, setCreando] = useState(false);
  const [borrando, setBorrando] = useState(null);

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
          <BotonAccion onClick={() => setCreando(true)} disabled={enviando}>
            <Icono nombre="plus" className="h-3.5 w-3.5" />
            Nueva
          </BotonAccion>
        }
      />

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
              ? 'Crea la primera para empezar a preguntar.'
              : 'Cambia el filtro o crea una nueva.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {lista.map((encuesta) => {
            const info = infoEstadoEncuesta(encuesta.estado);

            return (
              <li
                key={encuesta.id_encuesta}
                className={`${cardCls} border rounded-2xl p-4 flex items-start gap-4`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold break-words">{encuesta.titulo}</p>
                    <Badge texto={info.etiqueta} color={info.color} />
                  </div>

                  <p className={`text-[11px] ${tema.subtitle} mt-1`}>
                    {encuesta.total_preguntas}{' '}
                    {encuesta.total_preguntas === 1 ? 'pregunta visible' : 'preguntas visibles'} ·{' '}
                    {encuesta.total_respuestas}{' '}
                    {encuesta.total_respuestas === 1 ? 'respuesta' : 'respuestas'}
                    {encuesta.fecha_creacion &&
                      ` · creada el ${new Date(encuesta.fecha_creacion).toLocaleDateString('es-MX')}`}
                  </p>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <BotonIcono
                    icono="eye"
                    titulo="Ver resultados"
                    onClick={() => abrirResultados(encuesta)}
                    disabled={enviando}
                  />
                  <BotonIcono
                    icono="pencil"
                    titulo="Editar"
                    onClick={() => abrirEditor(encuesta)}
                    disabled={enviando}
                  />
                  <BotonIcono
                    icono="clipboard"
                    titulo="Duplicar"
                    onClick={() => hook.duplicar(encuesta)}
                    disabled={enviando}
                  />
                  <BotonIcono
                    icono="trash"
                    titulo="Eliminar"
                    danger
                    onClick={() => setBorrando(encuesta)}
                    disabled={enviando}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* --- alta --- */}
      <ModalBase
        show={creando}
        onClose={() => setCreando(false)}
        maxWidth="max-w-lg"
        closeOnBackdrop={false}
      >
        <h3 className="text-lg font-black uppercase tracking-wider mb-1">Nueva encuesta</h3>
        <p className="text-xs opacity-60 mb-5">
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
      <ModalConfirmacion
        show={Boolean(borrando)}
        titulo="Eliminar encuesta"
        mensaje={
          borrando
            ? `Se eliminará "${borrando.titulo}" con sus ${borrando.total_preguntas} preguntas. ${
                borrando.total_respuestas > 0
                  ? `Tiene ${borrando.total_respuestas} respuestas, así que el servidor no la va a dejar borrar: ciérrala en su lugar.`
                  : 'No tiene respuestas, así que se puede borrar.'
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

      <p className={`text-[11px] ${tema.subtitle}`}>
        <span className="opacity-70">Las respuestas son anónimas por diseño:</span> la encuesta
        no guarda nombre ni matrícula, sólo el programa que el alumno elige. Por eso una
        encuesta con respuestas no se puede borrar, sólo cerrar.
      </p>
    </div>
  );
}

export function SeccionEncuestas({ d }) {
  const hook = useSeccionEncuestas(d?.setFeedback);

  if (hook.vista === 'resultados') {
    return (
      <div className="space-y-4">
        <button
          onClick={hook.volverALista}
          className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 cursor-pointer inline-flex items-center gap-1"
        >
          <Icono nombre="arrow-left" className="h-3.5 w-3.5" />
          Volver a las encuestas
        </button>
        <PanelResultados
          cargando={hook.cargandoResultados}
          resultados={hook.resultados}
          alVolver={hook.volverALista}
        />
      </div>
    );
  }

  if (hook.vista === 'editor') {
    return (
      <div className="space-y-5">
        <button
          onClick={hook.volverALista}
          className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 cursor-pointer inline-flex items-center gap-1"
        >
          <Icono nombre="arrow-left" className="h-3.5 w-3.5" />
          Volver a las encuestas
        </button>

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
            <EditorEncuesta hook={hook} />
            <EditorPreguntas hook={hook} />
          </>
        )}
      </div>
    );
  }

  return <ListaEncuestas hook={hook} />;
}
