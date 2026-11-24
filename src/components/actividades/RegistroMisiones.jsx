import { useId, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';
import { campoActividadVisible, cotizarPedidoMisiones, validarRespuestasActividad, validarContactoInvitado, esFormatoMegamisiones, validarTelefonoMisiones } from '../../../shared/actividades';
import { misionesService } from '../../services/misiones.service';
import { actividadService } from '../../services/actividad.service';
import { BotonAccion } from '../ui/BotonAccion';
import { EstadoActividad } from './ActividadUI';
import { DocumentoMisiones } from './DocumentoMisiones';
import { gruposPreguntasMisiones } from '../../constants/preguntasMisiones';
import { ImagenPregunta } from './ImagenPregunta';
import { CampoRegistroActividad } from './CampoRegistroActividad';
import { ImagenesCuestionarioActividad } from './ImagenesCuestionarioActividad';
import { SelectorOpciones } from '../ui/SelectorOpciones';

const dinero = (centavos) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(centavos / 100);

export function ResumenRegistroMisiones({ registro, edicion, acceso, licenciaturas = [], mostrarAportaciones = true, mostrarImagenes = false }) {
  const { tema } = useTheme();
  const campos = registro.formulario_snapshot.map((campo) => {
    const actual = edicion?.campos_registro?.find((item) => item.clave === campo.clave);
    return actual ? { ...campo, imagen_url: actual.imagen_url, imagen_public_id: actual.imagen_public_id } : campo;
  });
  return <div className="space-y-4">
    <EstadoActividad estado={registro.estado} />
    <p className="font-bold">{registro.nombre_completo} · {registro.tipo_participante === 'invitado' ? 'Invitado' : 'Matrícula ' + registro.matricula}</p>
    {registro.correo && <p className="break-words text-sm">{registro.correo}{registro.telefono ? ' · ' + registro.telefono : ''}</p>}
    <dl className="grid items-start gap-3 sm:grid-cols-2">{campos.filter((campo) => campoActividadVisible(campo, registro.respuestas)).map((campo) => <div key={campo.clave}>
      <dt className={'text-sm ' + tema.subtitle}>{campo.etiqueta}</dt>
      <dd className="whitespace-pre-wrap break-words font-semibold">{campo.tipo === 'licenciatura' ? licenciaturas.find((item) => item.id_licenciatura === Number(registro.respuestas[campo.clave]))?.nombre || 'Sin especificar' : campo.tipo === 'fecha' && registro.respuestas[campo.clave] ? registro.respuestas[campo.clave].split('-').reverse().join('/') : registro.respuestas[campo.clave] ?? 'Sin especificar'}</dd>
      {mostrarImagenes && campo.imagen_url && <ImagenPregunta src={campo.imagen_url} alt={'Imagen para ' + campo.etiqueta} className="mt-2 h-28 w-full" />}
    </div>)}</dl>
    {registro.pedido?.lineas.length > 0 && <section className="rounded-xl border border-slate-400/25 p-4 space-y-2"><h4 className="font-bold">Tu pedido</h4>{registro.pedido.lineas.map((linea) => <p key={linea.id_producto + linea.talla} className="text-sm">{linea.cantidad} × {linea.nombre}{linea.talla ? ' · Talla ' + linea.talla : ''} · {dinero(linea.subtotal_centavos)}</p>)}<p className="font-bold">Total: {dinero(registro.pedido.total_centavos)} MXN</p><p className="text-sm">El pago se acuerda con el encargado.</p></section>}
    {mostrarAportaciones && registro.aportaciones?.filter((aporte) => aporte.estado !== 'cancelada').map((aporte) => <p key={aporte.id_aportacion} className="text-sm">{aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</p>)}
    <DocumentoMisiones id={registro.codigo_firmado_id} acceso={acceso} nombre="codigo-conducta-firmado.pdf">Descargar PDF firmado</DocumentoMisiones>
  </div>;
}

export function RegistroMisiones({ edicion, registro, invitado = false, acceso, onGuardado }) {
  const { usuario } = useAutenticacion();
  const { tema, inputCls, labelCls } = useTheme();
  const idFormulario = useId();
  const { licenciaturas, loading, error: errorLicenciaturas, recargar } = useLicenciaturas();
  const [respuestas, setRespuestas] = useState(registro?.respuestas || {});
  const [contacto, setContacto] = useState({ nombre_completo: registro?.nombre_completo || '', correo: registro?.correo || '', telefono: registro?.telefono || '' });
  const [matricula, setMatricula] = useState(usuario?.institutional_id || registro?.matricula || '');
  const [seleccion, setSeleccion] = useState(registro?.pedido?.lineas.map(({ id_producto, cantidad, talla }) => ({ id_producto, cantidad, talla })) || []);
  const [aportaciones, setAportaciones] = useState(registro?.aportaciones?.filter((aporte) => aporte.estado !== 'cancelada').map(({ id_opcion, cantidad }) => ({ id_opcion, cantidad })) || []);
  const [pdf, setPdf] = useState(null);
  const [editando, setEditando] = useState(!registro);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const config = registro?.misiones_snapshot || edicion.configuracion_misiones;
  const mega = esFormatoMegamisiones(config);
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const camposBase = registro?.estado === 'confirmado' ? registro.formulario_snapshot.map((campo) => {
    const actual = edicion.campos_registro.find((item) => item.clave === campo.clave);
    return actual ? { ...campo, imagen_url: actual.imagen_url, imagen_public_id: actual.imagen_public_id } : campo;
  }) : edicion.campos_registro;
  const campos = camposBase.filter((campo) => !invitado || campo.tipo !== 'licenciatura');
  const secciones = gruposPreguntasMisiones(config, campos);
  const abierta = edicion.estado_registro === 'abierta';
  const responder = (clave, valor) => setRespuestas((actual) => ({ ...actual, [clave]: valor }));
  let pedido;
  let errorPedido = '';
  try { pedido = cotizarPedidoMisiones(edicion.configuracion_misiones.productos, seleccion, registro?.pedido); }
  catch (fallo) { errorPedido = fallo.message; }
  const cambiarLinea = (indice, cambios) => setSeleccion((actual) => actual.map((linea, posicion) => posicion === indice ? { ...linea, ...cambios } : linea));
  const agregarProducto = (producto) => setSeleccion((actual) => {
    const indice = actual.findIndex((linea) => linea.id_producto === producto.id_producto && !linea.talla);
    return indice < 0 ? [...actual, { id_producto: producto.id_producto, cantidad: 1, talla: '' }] : actual.map((linea, posicion) => posicion === indice ? { ...linea, cantidad: Math.min(linea.cantidad + 1, 99) } : linea);
  });

  async function guardar(evento) {
    evento.preventDefault();
    if (pendiente) return;
    setError('');
    try {
      validarRespuestasActividad(campos, respuestas, hoy);
      if (invitado) validarContactoInvitado(contacto);
      if (mega) validarTelefonoMisiones(contacto.telefono);
      if (errorPedido) throw new Error(errorPedido);
      if (config.codigo_obligatorio && !pdf && !registro?.codigo_firmado_id) throw new Error('Adjunta el PDF firmado del código de conducta');
      if (pdf && (pdf.type !== 'application/pdf' || pdf.size > 10 * 1024 * 1024)) throw new Error('Adjunta un PDF de hasta 10 MB');
      setPendiente(true);
      const datos = { ...contacto, matricula, respuestas, pedido: seleccion, total_centavos: pedido.total_centavos, aportaciones };
      const resultado = invitado ? acceso ? await misionesService.editarInvitado(acceso, datos, pdf) : await misionesService.crearInvitado(edicion.id_edicion, datos, pdf) : await misionesService.guardarUnid(edicion.id_edicion, datos, pdf);
      onGuardado(resultado);
    } catch (fallo) { setError(fallo.message); }
    finally { setPendiente(false); }
  }

  async function cancelar() {
    setPendiente(true); setError('');
    try { await actividadService.cancelarRegistro(edicion.id_edicion); onGuardado({ cancelado: true }); }
    catch (fallo) { setError(fallo.message); }
    finally { setPendiente(false); }
  }

  const seccionPedido = (
    (edicion.configuracion_misiones.productos.some((producto) => producto.activo) || seleccion.length > 0) && <section aria-label="Tu pedido" className="space-y-4 border-t border-slate-400/25 pt-5">
        <h4 className="text-lg font-bold">Artículos que quieres adquirir (opcional)</h4>
        <p className={'text-sm ' + tema.subtitle}>Elige los artículos y cantidades. La talla de sudadera se pide al agregar esa prenda. El pago se acuerda con el encargado.</p>
        {seleccion.map((linea, indice) => {
          const producto = edicion.configuracion_misiones.productos.find((item) => item.id_producto === linea.id_producto);
          const previa = registro?.pedido?.lineas.find((item) => item.id_producto === linea.id_producto && item.talla === linea.talla);
          return <div className="space-y-3 rounded-xl border border-slate-400/25 p-4" key={indice}>
            <p className="font-bold">{producto?.nombre || previa?.nombre || 'Artículo retirado'}{producto?.activo === false ? ' · Retirado' : ''}</p>
            <div className="grid items-start gap-3 sm:grid-cols-2"><CampoRegistroActividad id={idFormulario + '-pedido-' + indice + '-cantidad'} etiqueta="Cantidad"><input id={idFormulario + '-pedido-' + indice + '-cantidad'} className={inputCls} type="number" min={1} max={99} step={1} required value={linea.cantidad} onChange={(evento) => cambiarLinea(indice, { cantidad: Number(evento.target.value) })} /></CampoRegistroActividad>
              {(producto?.requiere_talla || linea.talla) && <CampoRegistroActividad id={idFormulario + '-pedido-' + indice + '-talla'} etiqueta="Talla *"><SelectorOpciones id={idFormulario + '-pedido-' + indice + '-talla'} etiqueta="Talla" required valor={linea.talla} alCambiar={(talla) => cambiarLinea(indice, { talla })} botonClassName="h-11" opciones={[{ value: '', label: 'Selecciona talla' }, ...[...new Set([...(producto?.tallas || []), ...(linea.talla ? [linea.talla] : [])])].map((talla) => ({ value: talla, label: talla }))]} /></CampoRegistroActividad>}
            </div>
            <BotonAccion size="sm" variant="outline" onClick={() => setSeleccion((actual) => actual.filter((_linea, posicion) => posicion !== indice))}>Quitar del pedido</BotonAccion>
          </div>;
        })}
        <div className="flex flex-wrap gap-3">{edicion.configuracion_misiones.productos.filter((producto) => producto.activo).map((producto) => <BotonAccion key={producto.id_producto} variant="outline" size="sm" disabled={seleccion.length >= 40} onClick={() => agregarProducto(producto)}>Agregar {producto.nombre} · {dinero(producto.precio_centavos)}</BotonAccion>)}</div>
        {errorPedido ? <p role="alert" className="text-red-600 dark:text-red-400">{errorPedido}</p> : <p className="text-lg font-bold" aria-live="polite">Total: {dinero(pedido.total_centavos)} MXN</p>}
      </section>
  );
  const identificacionUnid = <><CampoRegistroActividad id={idFormulario + '-nombre'} etiqueta="Nombre completo"><input id={idFormulario + '-nombre'} className={inputCls} value={usuario?.nombre_completo || ''} readOnly /></CampoRegistroActividad><CampoRegistroActividad id={idFormulario + '-matricula'} etiqueta="Matrícula *"><input id={idFormulario + '-matricula'} className={inputCls} value={matricula} readOnly={Boolean(usuario?.institutional_id)} inputMode="numeric" pattern="[0-9]+" maxLength={30} required onChange={(evento) => setMatricula(evento.target.value)} /></CampoRegistroActividad></>;
  const contactoCampo = (clave, etiqueta, tipo) => <CampoRegistroActividad id={idFormulario + '-' + clave} etiqueta={etiqueta + ' *'} key={clave}><input id={idFormulario + '-' + clave} className={inputCls} type={tipo} required maxLength={clave === 'correo' ? 254 : clave === 'telefono' ? 40 : 150} value={contacto[clave]} onChange={(evento) => setContacto((actual) => ({ ...actual, [clave]: evento.target.value }))} /></CampoRegistroActividad>;

  function dibujarCampo(campo) {
    if (!campoActividadVisible(campo, respuestas)) return null;
    const id = idFormulario + '-' + campo.clave;
    const etiqueta = campo.etiqueta + (campo.obligatorio ? ' *' : ' (opcional)');
    const comunes = { id, 'aria-describedby': campo.ayuda ? id + '-ayuda' : undefined, className: inputCls, value: respuestas[campo.clave] ?? '', required: campo.obligatorio, onChange: (evento) => responder(campo.clave, evento.target.value) };
    return <CampoRegistroActividad id={id} etiqueta={etiqueta} ayuda={campo.ayuda} className={campo.tipo === 'texto_largo' ? 'sm:col-span-2' : ''} key={campo.clave}>
      {['seleccion', 'licenciatura'].includes(campo.tipo) ? <SelectorOpciones
        id={id} name={campo.clave} etiqueta={etiqueta} descripcionId={comunes['aria-describedby']}
        valor={String(respuestas[campo.clave] ?? '')} alCambiar={(valor) => responder(campo.clave, valor)}
        required={campo.obligatorio} disabled={campo.tipo === 'licenciatura' && loading} botonClassName="h-11"
        opciones={[{ value: '', label: 'Selecciona una opción' }, ...(campo.tipo === 'licenciatura' ? licenciaturas.map((item) => ({ value: String(item.id_licenciatura), label: item.nombre })) : campo.opciones.map((opcion) => ({ value: opcion, label: opcion })))]}
      /> : campo.tipo === 'texto_largo' ? <textarea {...comunes} maxLength={2000} rows={4} /> : <input {...comunes} type={campo.tipo === 'fecha' ? 'date' : campo.tipo === 'numero' ? 'number' : campo.clave.endsWith('_telefono') ? 'tel' : 'text'} min={campo.minimo} max={campo.tipo === 'fecha' && campo.no_futura ? hoy : campo.maximo} step={campo.tipo === 'numero' ? 1 : undefined} maxLength={500} />}
    </CampoRegistroActividad>;
  }

  if (registro && !editando) return <section aria-label="Tu inscripción a Misiones" className="space-y-4">
    <ResumenRegistroMisiones registro={registro} edicion={edicion} acceso={acceso} licenciaturas={licenciaturas} />
    {abierta && registro.estado !== 'cancelado' && <div className="flex flex-wrap gap-3"><BotonAccion onClick={() => setEditando(true)}>Editar mi registro</BotonAccion>{!invitado && <BotonAccion variant="outline" onClick={() => setCancelando(true)}>Cancelar inscripción</BotonAccion>}</div>}
    {cancelando && <div role="alert" className="space-y-3"><p>¿Confirmas la cancelación? Tus aportaciones recibidas y asistencias conservarán su historial.</p><BotonAccion variant="danger" disabled={pendiente} onClick={cancelar}>Confirmar cancelación</BotonAccion> <BotonAccion variant="outline" onClick={() => setCancelando(false)}>Conservar mi inscripción</BotonAccion></div>}
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
  </section>;
  if (!abierta) return <p className={tema.subtitle}>{edicion.estado_registro === 'proxima' ? 'El formulario estará disponible al abrir las inscripciones.' : 'El periodo de inscripción y edición está cerrado.'}</p>;
  if (registro?.estado === 'cancelado' && invitado) return <p>Tu inscripción está cancelada. Consulta al encargado.</p>;
  const clavesBase = secciones.flatMap(({ claves }) => claves);
  return <form aria-label="Registro a Misiones" onSubmit={guardar} className="registro-actividad space-y-6 rounded-2xl border border-slate-400/15 bg-white/95 p-6 shadow-[-4px_-4px_12px_rgba(0,0,0,0.08),4px_4px_12px_rgba(0,0,0,0.12)] dark:bg-[#12203f]">
    <fieldset disabled={pendiente} className="min-w-0 space-y-6">
      {!mega && <section className="space-y-3"><h4 className="text-lg font-bold">{invitado ? 'Registro de invitado' : 'Participante UNID'}</h4>
        <div className="grid gap-4 sm:grid-cols-2">{invitado ? [['nombre_completo', 'Nombre completo', 'text'], ['correo', 'Correo electrónico', 'email'], ['telefono', 'Teléfono', 'tel']].map(([clave, etiqueta, tipo]) => contactoCampo(clave, etiqueta, tipo)) : identificacionUnid}</div>
      </section>}
      {secciones.map((grupo, indice) => <section aria-label={grupo.titulo} className="space-y-4 border-t border-slate-400/25 pt-5" key={grupo.titulo}>
        <header className="space-y-1">{mega && <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">MEGAMISIONES · {indice + 1} de {secciones.length}</p>}<h4 className="text-lg font-bold">{grupo.titulo}</h4>{mega && <p className={'text-sm ' + tema.subtitle}>{grupo.descripcion}</p>}</header>
        {mega && grupo.id === 'contacto' && <>
          <p className={'text-sm leading-relaxed ' + tema.subtitle}>Tus datos se usarán para tu inscripción y la organización de la misión. El equipo puede contactarte por correo o WhatsApp con información de esta actividad.</p>
          {invitado ? contactoCampo('correo', 'Correo electrónico', 'email') : <CampoRegistroActividad id={idFormulario + '-correo'} etiqueta="Correo institucional" ayuda="Usamos el correo de tu cuenta UNID."><input id={idFormulario + '-correo'} aria-describedby={idFormulario + '-correo-ayuda'} className={inputCls} type="email" value={usuario?.correo_institucional || registro?.correo || ''} readOnly/></CampoRegistroActividad>}
        </>}
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {mega && grupo.id === 'personales' && <>{invitado ? contactoCampo('nombre_completo', 'Nombre completo', 'text') : identificacionUnid}{contactoCampo('telefono', 'Teléfono celular', 'tel')}</>}
          {campos.filter((campo) => grupo.claves.includes(campo.clave)).map(dibujarCampo)}
        </div>
        {mega && grupo.id === 'logistica' && <>
          {config.informacion_kit && <p className={'whitespace-pre-line text-sm ' + tema.subtitle}>{config.informacion_kit}</p>}
          {seccionPedido || <p className={'text-sm ' + tema.subtitle}>Los artículos extra se mostrarán cuando el encargado publique el catálogo con sus precios y tallas.</p>}
        </>}
      </section>)}
      {campos.some((campo) => !clavesBase.includes(campo.clave)) && <div className="grid items-start gap-4 sm:grid-cols-2">{campos.filter((campo) => !clavesBase.includes(campo.clave)).map(dibujarCampo)}</div>}
      {!invitado && campos.some((campo) => campo.tipo === 'licenciatura') && errorLicenciaturas && <div role="alert"><p>No se pudieron cargar las licenciaturas.</p><BotonAccion variant="outline" onClick={recargar}>Volver a cargar</BotonAccion></div>}
      {!mega && seccionPedido}
      {(edicion.requiere_aportacion || edicion.catalogo?.length > 0 || registro?.aportaciones?.length > 0) && <section className="space-y-3"><h4 className="font-bold">Aportaciones para la actividad{edicion.requiere_aportacion ? ' (obligatorias)' : ' (opcionales)'}</h4><p className="text-sm">Comida, globos u otros materiales para la actividad.</p>{[...(edicion.catalogo || []), ...(registro?.aportaciones || []).filter((aporte) => aporte.estado !== 'cancelada' && !(edicion.catalogo || []).some((opcion) => opcion.id_opcion === aporte.id_opcion))].map((opcion) => {
        const seleccionada = aportaciones.find((aporte) => aporte.id_opcion === opcion.id_opcion);
        const anterior = registro?.aportaciones?.find((aporte) => aporte.id_opcion === opcion.id_opcion && aporte.estado !== 'cancelada');
        const recibida = anterior?.estado === 'recibida';
        const minimo = anterior?.cantidad_minima || opcion.cantidad_minima;
        return <div key={opcion.id_opcion} className="space-y-2"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(seleccionada)} disabled={recibida} onChange={(evento) => setAportaciones((actual) => evento.target.checked ? [...actual, { id_opcion: opcion.id_opcion, cantidad: minimo }] : actual.filter((aporte) => aporte.id_opcion !== opcion.id_opcion))} />{anterior?.nombre || opcion.nombre}{recibida ? ' · Recibida' : ''}</label>{seleccionada && <label className={labelCls}>Cantidad · mínimo {Number(minimo)} {anterior?.unidad || opcion.unidad}<input className={inputCls} type="number" min={minimo} max={1000000} step="0.001" required readOnly={recibida} value={seleccionada.cantidad} onChange={(evento) => setAportaciones((actual) => actual.map((aporte) => aporte.id_opcion === opcion.id_opcion ? { ...aporte, cantidad: evento.target.value } : aporte))} /></label>}</div>;
      })}</section>}
      {config.codigo_documento && <section className="space-y-3 border-t border-slate-400/25 pt-5"><h4 className="text-lg font-bold">Código de conducta</h4><p className="text-sm">Descarga el documento, fírmalo electrónicamente y adjunta el PDF firmado.</p>
        <DocumentoMisiones id={config.codigo_documento} acceso={acceso} />
        <DocumentoMisiones id={registro?.codigo_firmado_id} acceso={acceso} nombre="codigo-conducta-firmado.pdf">Revisar mi PDF firmado</DocumentoMisiones>
        <label className={labelCls}>PDF firmado{config.codigo_obligatorio ? ' *' : ' (opcional)'}<input type="file" className={inputCls} accept="application/pdf,.pdf" required={config.codigo_obligatorio && !registro?.codigo_firmado_id} onChange={(evento) => setPdf(evento.target.files?.[0] || null)} /></label><p className={'text-xs ' + tema.subtitle}>Tamaño máximo: 10 MB.</p>
      </section>}
      <ImagenesCuestionarioActividad campos={campos} respuestas={respuestas} />
      {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3"><BotonAccion type="submit" disabled={pendiente || Boolean(errorPedido)}>{pendiente ? 'Guardando…' : registro ? 'Guardar cambios' : 'Confirmar inscripción'}</BotonAccion>{registro && <BotonAccion variant="outline" onClick={() => setEditando(false)}>Volver a mi registro</BotonAccion>}</div>
    </fieldset>
  </form>;
}
