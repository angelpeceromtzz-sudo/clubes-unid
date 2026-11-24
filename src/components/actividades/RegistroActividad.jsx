import { useId, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';
import { actividadService } from '../../services/actividad.service';
import { validarRespuestasActividad, validarAportacionesActividad, camposRegistroTrineo, cotizarCamisaTrineo } from '../../../shared/actividades';
import { BotonAccion } from '../ui/BotonAccion';
import { EstadoActividad } from './ActividadUI';
import { RegistroMisiones } from './RegistroMisiones';
import { ResumenCartaTrineo, SelectorCartaTrineo } from './CartaTrineo';
import { CampoRegistroActividad } from './CampoRegistroActividad';
import { ImagenesCuestionarioActividad } from './ImagenesCuestionarioActividad';
import { SelectorOpciones } from '../ui/SelectorOpciones';
import { ResumenCamisaTrineo } from './ResumenCamisaTrineo';

export function RegistroActividad({ edicion, registro, onGuardado }) {
  if (edicion.configuracion_misiones?.version === 2) return <RegistroMisiones edicion={edicion} registro={registro} onGuardado={(resultado) => onGuardado(resultado.cancelado ? 'Tu inscripción fue cancelada.' : 'Tu inscripción está guardada.')} />;
  return <RegistroActividadAnterior edicion={edicion} registro={registro} onGuardado={onGuardado} />;
}

function RegistroActividadAnterior({ edicion, registro, onGuardado }) {
  const { usuario } = useAutenticacion();
  const { tema, inputCls, labelCls } = useTheme();
  const idFormulario = useId();
  const { licenciaturas, loading, error: errorLicenciaturas, recargar } = useLicenciaturas();
  const confirmado = registro?.estado === 'confirmado';
  const [editando, setEditando] = useState(!confirmado);
  const [matricula, setMatricula] = useState(usuario.institutional_id || registro?.matricula || '');
  const [respuestas, setRespuestas] = useState(registro?.respuestas || {});
  const [solicitaCamisa, setSolicitaCamisa] = useState(registro?.pedido ? registro.pedido.lineas.length > 0 : null);
  const aportacionesAnteriores = (registro?.aportaciones || []).filter((aporte) => !aporte.es_regalo_carta);
  const [aportaciones, setAportaciones] = useState(aportacionesAnteriores.filter((aporte) => aporte.estado !== 'cancelada').map((aporte) => ({ id_opcion: aporte.id_opcion, cantidad: aporte.cantidad })));
  const [carta, setCarta] = useState(registro?.carta || null);
  const [versionCartas, setVersionCartas] = useState(0);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const abierta = edicion.estado_registro === 'abierta';
  const usaCartas = edicion.plantilla === 'trineo';
  const regaloRecibido = registro?.carta?.estado === 'entregada';
   const cartaObligatoria = edicion.carta_obligatoria !== false;
   const requiereCarta = usaCartas && cartaObligatoria && (!confirmado || Boolean(carta));
   const camposPrevios = confirmado ? registro.formulario_snapshot.map((campo) => {
     const actual = edicion.campos_registro.find((item) => item.clave === campo.clave);
     return actual ? { ...campo, imagen_url: actual.imagen_url, imagen_public_id: actual.imagen_public_id } : campo;
   }) : edicion.campos_registro;
  const campos = usaCartas ? camposRegistroTrineo(camposPrevios) : camposPrevios;
  const campoCamisa = edicion.campos_registro.find((campo) => campo.clave === 'talla');
  let pedidoCamisa;
  let errorCamisa = '';
  if (usaCartas && solicitaCamisa !== null && (!solicitaCamisa || respuestas.talla)) {
    try { pedidoCamisa = cotizarCamisaTrineo({ campo: campoCamisa, solicita: solicitaCamisa, talla: respuestas.talla, anterior: confirmado ? registro.pedido : null }); }
    catch (fallo) { errorCamisa = fallo.message; }
  }
  const opcionesRegalosAnteriores = new Set((registro?.aportaciones || []).filter((aporte) => aporte.es_regalo_carta).map((aporte) => aporte.id_opcion));
  const catalogo = edicion.catalogo.filter((opcion) => !opcionesRegalosAnteriores.has(opcion.id_opcion));
  for (const previo of aportacionesAnteriores) {
    if (previo.estado !== 'cancelada' && !catalogo.some((opcion) => opcion.id_opcion === previo.id_opcion)) catalogo.push({ ...previo, activa: false });
  }
  const hayLicenciatura = campos.some((campo) => campo.tipo === 'licenciatura');
  const responder = (clave, valor) => setRespuestas((actual) => ({ ...actual, [clave]: valor }));

  async function guardar(evento) {
    evento.preventDefault();
    if (pendiente) return;
    setError('');
    try {
      if (usaCartas && solicitaCamisa === null) throw new Error('Indica si ya tienes camisa o necesitas una');
      if (usaCartas && solicitaCamisa && !respuestas.talla) throw new Error('Selecciona la talla de tu camisa');
      if (errorCamisa) throw new Error(errorCamisa);
      validarRespuestasActividad(campos, respuestas);
      validarAportacionesActividad(aportaciones, catalogo, edicion.requiere_aportacion, aportacionesAnteriores);
      if (requiereCarta && !carta) throw new Error('Elige al niño de tu carta antes de confirmar tu inscripción');
      setPendiente(true);
      await actividadService.guardarRegistro(edicion.id_edicion, { matricula, respuestas, aportaciones, ...(usaCartas ? { id_carta: carta?.id_carta ?? null, solicita_camisa: solicitaCamisa, total_centavos: pedidoCamisa.total_centavos } : {}) });
      onGuardado('Tu inscripción está confirmada.');
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); if (fallo.status === 409) setVersionCartas((actual) => actual + 1); } finally { setPendiente(false); }
  }

  async function cancelar() {
    if (pendiente) return;
    setPendiente(true); setError('');
    try { await actividadService.cancelarRegistro(edicion.id_edicion); onGuardado('Tu inscripción fue cancelada.'); }
    catch (fallo) { setError(fallo.mensajeServidor || fallo.message); }
    finally { setPendiente(false); }
  }

  if (!editando && confirmado) return <section className="space-y-4" aria-label="Tu inscripción">
    <EstadoActividad estado="confirmado" /><p>{registro.nombre_completo} · Matrícula {registro.matricula}</p>
    <ResumenCartaTrineo carta={registro.carta} />
    {usaCartas && !registro.carta && <p className="text-sm text-amber-700 dark:text-amber-300">Este registro anterior no tiene carta vinculada.{!regaloRecibido && abierta ? ' Edita tu registro para elegir al niño de tu carta.' : ' Consulta al encargado para revisar tu aportación.'}</p>}
     <dl className="grid gap-3 sm:grid-cols-2">{campos.map((campo) => <div key={campo.clave}><dt className={'text-sm ' + tema.subtitle}>{campo.etiqueta}</dt><dd className="font-semibold">{campo.tipo === 'licenciatura' ? licenciaturas.find((item) => item.id_licenciatura === Number(registro.respuestas[campo.clave]))?.nombre || 'Sin especificar' : registro.respuestas[campo.clave] || 'Sin especificar'}</dd></div>)}</dl>
    <ResumenCamisaTrineo pedido={registro.pedido} />
    {aportacionesAnteriores.filter((aporte) => aporte.estado !== 'cancelada').map((aporte) => <p key={aporte.id_aportacion}>Aportación para la actividad · {aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</p>)}
    {abierta && <div className="flex flex-wrap gap-3"><BotonAccion onClick={() => setEditando(true)}>Editar mi registro</BotonAccion><BotonAccion variant="outline" onClick={() => setCancelando(true)}>Cancelar inscripción</BotonAccion></div>}
    {cancelando && <div className="space-y-3" role="alert"><p>¿Confirmas la cancelación de tu inscripción?{registro.carta?.estado === 'reservada' ? ' La carta quedará disponible para otro alumno.' : ''} Las aportaciones recibidas y cualquier asistencia registrada conservarán su historial.</p><div className="flex flex-wrap gap-3"><BotonAccion variant="danger" disabled={pendiente} onClick={cancelar}>Confirmar cancelación</BotonAccion><BotonAccion variant="outline" disabled={pendiente} onClick={() => setCancelando(false)}>Conservar mi inscripción</BotonAccion></div></div>}
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
  </section>;

  if (!abierta) return <p className={tema.subtitle}>{edicion.estado_registro === 'proxima' ? 'El registro estará disponible durante el periodo de inscripción.' : 'Las inscripciones de esta edición están cerradas.'}</p>;

  return <form onSubmit={guardar} className="registro-actividad space-y-6 rounded-2xl border border-slate-400/15 bg-white/95 p-6 shadow-[-4px_-4px_12px_rgba(0,0,0,0.08),4px_4px_12px_rgba(0,0,0,0.12)] dark:bg-slate-900" aria-label="Registro a la actividad">
    <fieldset disabled={pendiente} className="min-w-0 space-y-5">
    {registro?.estado && <EstadoActividad estado={registro.estado} />}
    {registro?.historial_cartas?.length > 0 && !registro.carta && <p className="text-sm">Tu reserva anterior fue liberada al cancelar la inscripción. Elige una carta disponible para registrarte de nuevo.</p>}
     {usaCartas && (!regaloRecibido || registro?.carta) && <SelectorCartaTrineo idEdicion={edicion.id_edicion} actual={registro?.carta} seleccionada={carta} onSeleccionar={setCarta} bloqueada={Boolean(regaloRecibido)} obligatoria={cartaObligatoria} version={versionCartas} />}
    {usaCartas && confirmado && !carta && <p className="text-sm text-amber-700 dark:text-amber-300">Tu inscripción anterior puede conservarse sin carta. Puedes elegir una para registrar el compromiso de regalo, aparte de las aportaciones para la actividad.</p>}
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <CampoRegistroActividad id={idFormulario + '-nombre'} etiqueta="Nombre completo"><input id={idFormulario + '-nombre'} className={inputCls} value={usuario.nombre_completo || ''} readOnly /></CampoRegistroActividad>
      <CampoRegistroActividad id={idFormulario + '-matricula'} etiqueta="Matrícula *"><input id={idFormulario + '-matricula'} className={inputCls} value={matricula} onChange={(evento) => setMatricula(evento.target.value)} readOnly={Boolean(usuario.institutional_id)} inputMode="numeric" pattern="[0-9]+" maxLength={30} required /></CampoRegistroActividad>
      {campos.map((campo) => {
        const id = idFormulario + '-' + campo.clave;
        const esCamisa = usaCartas && campo.clave === 'talla';
        const obligatorio = campo.obligatorio || esCamisa;
        const etiqueta = campo.etiqueta + (obligatorio ? ' *' : ' (opcional)');
        const comunes = { id, 'aria-describedby': campo.ayuda ? id + '-ayuda' : undefined, className: inputCls, value: respuestas[campo.clave] ?? '', required: campo.obligatorio, onChange: (evento) => responder(campo.clave, evento.target.value) };
        return <CampoRegistroActividad id={id} etiqueta={esCamisa ? 'Camisa' : etiqueta} ayuda={campo.ayuda} className={campo.tipo === 'texto_largo' ? 'sm:col-span-2' : ''} key={campo.clave}>
          {esCamisa ? <div className="space-y-3">
            <SelectorOpciones
              id={id + '-tiene'} name="tiene_camisa" etiqueta="¿Cuentas con camisa?" valor={solicitaCamisa === null ? '' : solicitaCamisa ? 'no' : 'si'}
              alCambiar={(valor) => { const necesita = valor === 'no'; setSolicitaCamisa(necesita); if (!necesita) responder(campo.clave, ''); }}
              required opciones={[{ value: '', label: 'Selecciona una opción' }, { value: 'si', label: 'Sí, ya tengo camisa' }, { value: 'no', label: 'No, necesito una camisa' }]} botonClassName="h-11"
            />
            {errorCamisa && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorCamisa}</p>}
          </div> : campo.tipo === 'seleccion' || campo.tipo === 'licenciatura' ? <SelectorOpciones
            id={id} name={campo.clave} etiqueta={etiqueta} descripcionId={comunes['aria-describedby']}
            valor={String(respuestas[campo.clave] ?? '')} alCambiar={(valor) => responder(campo.clave, valor)}
            required={obligatorio} disabled={campo.tipo === 'licenciatura' && loading} botonClassName="h-11"
            opciones={[{ value: '', label: 'Selecciona una opción' }, ...(campo.tipo === 'licenciatura' ? licenciaturas.map((item) => ({ value: String(item.id_licenciatura), label: item.nombre })) : campo.opciones.map((opcion) => ({ value: opcion, label: opcion })))]}
          /> : campo.tipo === 'texto_largo' ? <textarea {...comunes} rows={4} maxLength={2000} /> : <input {...comunes} type={campo.tipo === 'fecha' ? 'date' : campo.tipo === 'numero' ? 'number' : 'text'} min={campo.minimo} max={campo.maximo} step={campo.tipo === 'numero' ? 1 : undefined} maxLength={500} />}
        </CampoRegistroActividad>;
      })}
    </div>
    {hayLicenciatura && errorLicenciaturas && <div role="alert"><p>No se pudieron cargar las licenciaturas.</p><BotonAccion variant="outline" onClick={recargar}>Volver a cargar licenciaturas</BotonAccion></div>}
    {(edicion.requiere_aportacion || catalogo.length > 0) && <details className="rounded-xl border border-slate-400/25 p-4" open><summary className={'cursor-pointer text-lg font-bold ' + tema.title}>Aportaciones para la actividad{edicion.requiere_aportacion ? ' (obligatorias)' : ' (opcionales)'}</summary><div className="accordion-content pt-4"><fieldset className="space-y-4">
      <p className={'text-sm ' + tema.subtitle}>Comida, globos u otros materiales para la actividad.{usaCartas ? ' Son independientes del regalo de tu carta.' : ''} El encargado registrará cada recepción por separado.</p>
      {catalogo.map((opcion) => {
        const seleccionada = aportaciones.find((aporte) => aporte.id_opcion === opcion.id_opcion);
        const anterior = aportacionesAnteriores.find((aporte) => aporte.id_opcion === opcion.id_opcion && aporte.estado !== 'cancelada');
        const recibida = anterior?.estado === 'recibida';
        const minimo = anterior?.cantidad_minima || opcion.cantidad_minima;
        const nombre = anterior?.nombre || opcion.nombre;
        const unidad = anterior?.unidad || opcion.unidad;
        return <div key={opcion.id_opcion} className="space-y-2">
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(seleccionada)} disabled={recibida} onChange={(evento) => setAportaciones((actual) => evento.target.checked ? [...actual, { id_opcion: opcion.id_opcion, cantidad: minimo }] : actual.filter((aporte) => aporte.id_opcion !== opcion.id_opcion))} />{nombre}{recibida ? ' · Recibida' : ''}</label>
          {opcion.descripcion && <p className={'text-sm ' + tema.subtitle}>{opcion.descripcion}</p>}
          {seleccionada && <label className={labelCls}>Cantidad · mínimo {Number(minimo)} {unidad}<input className={inputCls + ' max-w-xs'} type="number" min={minimo} max={1000000} step="0.001" required value={seleccionada.cantidad} readOnly={recibida} onChange={(evento) => setAportaciones((actual) => actual.map((aporte) => aporte.id_opcion === opcion.id_opcion ? { ...aporte, cantidad: evento.target.value } : aporte))} /></label>}
        </div>;
      })}
    </fieldset></div></details>}
    {usaCartas && <ResumenCamisaTrineo pedido={pedidoCamisa} campo={solicitaCamisa ? campoCamisa : null} valor={respuestas.talla} onChange={(valor) => responder('talla', valor)} />}
    <ImagenesCuestionarioActividad campos={campos} respuestas={respuestas} />
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-3"><BotonAccion type="submit" disabled={pendiente || Boolean(errorCamisa)}>{pendiente ? 'Guardando…' : confirmado ? 'Guardar cambios' : 'Confirmar inscripción'}</BotonAccion>{confirmado && <BotonAccion variant="outline" onClick={() => setEditando(false)}>Volver a mi registro</BotonAccion>}</div>
    </fieldset>
  </form>;
}
