import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { camposPlantillaActividad, configuracionMisionesInicial, normalizarEdicionActividad, normalizarOpcionAportacion, validarPublicacionEdicion } from '../../../shared/actividades';
import { PASOS_EDICION, pendientesEdicion, prepararDatosEdicion, resolverPasoEdicion } from '../../utils/edicionActividad';
import { ConfiguracionMisiones } from './ConfiguracionMisiones';
import { EditorCamposActividad } from './EditoresActividad';
import { VistaPreviaActividad } from './VistaPreviaActividad';
import { BloqueEdicionActividad } from './BloqueEdicionActividad';
import { LugarEdicionActividad } from './LugarEdicionActividad';
import { BotonAccion } from '../ui/BotonAccion';

export function FormularioEdicionActividad({ actividad, edicion, onGuardado, onCancelar }) {
  const { usuario } = useAutenticacion();
  const { datos: operacion, cargando, error: errorCatalogo, recargar } = useActividadRecurso(edicion ? '/gestion/ediciones/' + edicion.id_edicion : null, usuario?.id_usuario || usuario?.id);
  const especial = ['trineo', 'misiones'].includes(actividad.plantilla);
  const configuracionInicial = actividad.plantilla === 'misiones' && !edicion ? configuracionMisionesInicial() : null;
  const [datos, setDatos] = useState({ nombre: '', descripcion: '', lugar: '', ubicacion_maps: '', hora_inicio: '', requiere_registro: especial, requiere_aportacion: false, destacable: especial, ...(configuracionInicial ? { configuracion_misiones: configuracionInicial } : {}), campos_registro: camposPlantillaActividad(actividad.plantilla, configuracionInicial), ...edicion, ...edicion?.propuesta });
  const [opciones, setOpciones] = useState([]);
  const [navegacion, setNavegacion] = useState({ paso: 0, alcanzado: 0 });
  const [erroresVisibles, setErroresVisibles] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargandoPdf, setCargandoPdf] = useState(false);
  const tituloRef = useRef(null);
  const tituloId = useId();
  const { tema, inputCls } = useTheme();
  const labelCls = 'block space-y-2 text-sm font-semibold ' + tema.title;
  const { paso, alcanzado } = navegacion;
  const bloqueado = edicion?.estado === 'pendiente' || edicion?.estado === 'archivada' || edicion?.estado_propuesta === 'pendiente';
  const ocupado = guardando || cargandoPdf;
  const catalogo = edicion ? operacion?.catalogo || [] : opciones;
  const cambiar = (clave, valor) => setDatos((actual) => ({ ...actual, [clave]: valor }));
  const entrada = prepararDatosEdicion(datos, actividad.plantilla);
  const pendientes = pendientesEdicion(datos, actividad.plantilla, { catalogo, existente: Boolean(edicion), cargandoCatalogo: cargando, errorCatalogo });
  const hayPendientes = pendientes.some((errores) => errores.length > 0);
  useEffect(() => { tituloRef.current?.focus(); }, [paso]);

  function irAPaso(destino) {
    if (ocupado || bloqueado) return;
    const siguiente = resolverPasoEdicion(navegacion, destino, pendientes);
    setError('');
    setErroresVisibles(siguiente.pendiente !== null);
    if (siguiente.pendiente !== null) {
      if (siguiente.paso === paso) tituloRef.current?.focus();
    }
    setNavegacion({ paso: siguiente.paso, alcanzado: siguiente.alcanzado });
  }

  async function guardar(borrador = false) {
    if (ocupado || bloqueado) return;
    setError('');
    if (!borrador) {
      const primero = pendientes.findIndex((errores) => errores.length > 0);
      if (primero >= 0) {
        setErroresVisibles(true);
        setNavegacion((actual) => ({ ...actual, paso: primero }));
        if (primero === paso) tituloRef.current?.focus();
        return;
      }
    }
    setGuardando(true);
    try {
      const normalizada = normalizarEdicionActividad(entrada, actividad.plantilla);
      if (!borrador) {
        const opcionesValidas = edicion ? catalogo : opciones.map((opcion) => ({ ...normalizarOpcionAportacion(opcion), activa: true }));
        validarPublicacionEdicion(normalizada, opcionesValidas);
      }
      const payload = { ...normalizada };
      if (!edicion && (!borrador || opciones.length)) payload.catalogo_aportaciones = normalizada.requiere_registro ? opciones.map(normalizarOpcionAportacion) : [];
      const resultado = await actividadService.guardarEdicion(actividad.id_actividad, edicion?.id_edicion, payload);
      onGuardado(resultado.id_edicion);
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); tituloRef.current?.focus(); }
    finally { setGuardando(false); }
  }

  function estadoPaso(indice) {
    if (indice > alcanzado) return 'Aún no disponible';
    const pendiente = indice === 3 ? hayPendientes : pendientes[indice].length > 0;
    if (indice === paso) return pendiente ? 'Actual · Pendiente' : 'Actual';
    return pendiente ? 'Pendiente' : indice === 3 ? 'Listo para revisar' : 'Completado';
  }
  const fecha = (clave, titulo, obligatoria = false) => <label className={labelCls} key={clave}>{titulo}<input type="date" className={inputCls} required={obligatoria} value={datos[clave] || ''} onChange={(evento) => cambiar(clave, evento.target.value)} /></label>;

  return <form noValidate aria-label="Configurar edición" className="space-y-6" onSubmit={(evento) => { evento.preventDefault(); if (paso < 3) irAPaso(paso + 1); else guardar(); }}>
    <nav aria-label="Pasos para crear la edición" className="space-y-3">
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {PASOS_EDICION.map(({ titulo }, indice) => {
          const estado = estadoPaso(indice);
          const completo = estado === 'Completado' || estado === 'Listo para revisar';
          return <li key={titulo} className="min-w-0">
            <button type="button" aria-current={paso === indice ? 'step' : undefined} aria-label={(indice + 1) + '. ' + titulo + '. ' + estado} disabled={ocupado || bloqueado || indice > alcanzado} onClick={() => irAPaso(indice)} className={'flex h-full w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed ' + (paso === indice ? 'border-amber-400 bg-amber-400/10 ' + tema.title : indice > alcanzado ? 'border-slate-400/15 opacity-45 ' + tema.subtitle : completo ? 'border-emerald-500/40 hover:bg-emerald-500/10 ' + tema.title : 'border-amber-500/40 hover:bg-amber-400/10 ' + tema.title)}>
              <span className="text-xs font-bold">{indice + 1}. {titulo}</span>
              <span className={'text-[11px] ' + (completo ? 'text-emerald-700 dark:text-emerald-300' : tema.subtitle)}>{estado}</span>
            </button>
          </li>;
        })}
      </ol>
      <p className={'text-xs ' + tema.subtitle}>Puedes volver a los pasos alcanzados y modificar sus datos. Usa Continuar para abrir el siguiente.</p>
    </nav>
    <header className="space-y-2">
      <p className={'text-xs ' + tema.subtitle}>Paso {paso + 1} de 4 · {actividad.nombre}</p>
      <h3 id={tituloId} ref={tituloRef} tabIndex={-1} className="rounded text-xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-amber-400">{PASOS_EDICION[paso].titulo}</h3>
      <p className={'text-sm ' + tema.subtitle}>{PASOS_EDICION[paso].descripcion}</p>
      <p className={'text-xs ' + tema.subtitle}>Los campos con * son obligatorios. Tus cambios se guardan al pulsar Guardar.</p>
    </header>
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    {erroresVisibles && pendientes[paso]?.length > 0 && <div role="alert" className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-400/10 p-4 text-sm">
      <p className="font-bold">Revisa este apartado para continuar:</p>
      <ul className="list-disc space-y-1 pl-5">{pendientes[paso].map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul>
    </div>}
    <fieldset aria-labelledby={tituloId} disabled={bloqueado || ocupado} className="min-w-0 space-y-5">
      {paso === 0 && <>
        <BloqueEdicionActividad titulo="Lo esencial" descripcion="Dale un nombre fácil de reconocer y cuenta de qué se trata.">
          <label className={labelCls}>Nombre de la edición *<input className={inputCls} value={datos.nombre} required maxLength={160} placeholder={'Por ejemplo: ' + actividad.nombre + ' 2026'} aria-invalid={erroresVisibles && !datos.nombre.trim() || undefined} onChange={(evento) => cambiar('nombre', evento.target.value)} /></label>
          <label className={labelCls}>¿Qué deben saber los participantes? <span className={'font-normal ' + tema.subtitle}>(opcional)</span><textarea className={inputCls} value={datos.descripcion} rows={4} maxLength={5000} placeholder="Cuenta qué harán, qué deben llevar y cualquier indicación importante." onChange={(evento) => cambiar('descripcion', evento.target.value)} /></label>
        </BloqueEdicionActividad>
        <BloqueEdicionActividad titulo="¿Dónde será?" descripcion="Ayuda a los participantes a encontrar el punto de encuentro.">
          <LugarEdicionActividad lugar={datos.lugar} ubicacionMaps={datos.ubicacion_maps} disabled={ocupado || bloqueado} mostrarErrores={erroresVisibles} onChange={(cambios) => setDatos((actual) => ({ ...actual, ...cambios }))} />
        </BloqueEdicionActividad>
      </>}
      {paso === 1 && <>
        <BloqueEdicionActividad titulo="Fechas de la actividad" descripcion="Define los días y el horario en que se realizará esta edición.">
          <div className="grid gap-4 sm:grid-cols-2">{fecha('fecha_inicio', 'Fecha de inicio *', true)}{fecha('fecha_fin', 'Fecha de fin (opcional)')}<label className={labelCls}>Hora de inicio (opcional)<input type="time" className={inputCls} value={datos.hora_inicio || ''} onChange={(evento) => cambiar('hora_inicio', evento.target.value)} /></label></div>
          <p className={'text-sm ' + tema.subtitle}>Si dura un solo día, basta con la fecha de inicio.</p>
        </BloqueEdicionActividad>
        <BloqueEdicionActividad titulo="Destacado en el sitio" descripcion="Elige cuándo aparecerá como destacada. Las fechas de inscripción se configuran en el siguiente paso.">
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={datos.destacable} onChange={(evento) => cambiar('destacable', evento.target.checked)} />Destacar automáticamente durante un periodo</label>
          {datos.destacable && <div className="grid gap-4 sm:grid-cols-2">{fecha('destacada_desde', 'Destacar desde *', true)}{fecha('destacada_hasta', 'Destacar hasta *', true)}</div>}
        </BloqueEdicionActividad>
      </>}
      {paso === 2 && <>
        <BloqueEdicionActividad titulo="Periodo de inscripción" descripcion="Decide si habrá registro y durante qué fechas podrán inscribirse los participantes.">
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" disabled={especial} checked={datos.requiere_registro} onChange={(evento) => cambiar('requiere_registro', evento.target.checked)} />Esta edición tendrá inscripción</label>
          {entrada.requiere_registro ? <div className="grid gap-4 sm:grid-cols-2">{fecha('inscripcion_desde', 'Inscripciones desde *', true)}{fecha('inscripcion_hasta', 'Inscripciones hasta *', true)}</div> : <p className={'text-sm ' + tema.subtitle}>Se publicará como una edición informativa, sin formulario de inscripción.</p>}
        </BloqueEdicionActividad>
        {entrada.requiere_registro && <>
          <BloqueEdicionActividad titulo="Preguntas del formulario" descripcion="Revisa los datos que pedirás, sus opciones y cuáles serán obligatorios.">
            <EditorCamposActividad campos={datos.campos_registro} plantilla={actividad.plantilla} configuracion={datos.configuracion_misiones} onChange={(valor) => cambiar('campos_registro', valor)} />
          </BloqueEdicionActividad>
          {datos.configuracion_misiones?.version === 2 && <ConfiguracionMisiones idActividad={actividad.id_actividad} configuracion={datos.configuracion_misiones} onChange={(valor) => cambiar('configuracion_misiones', valor)} onCargando={setCargandoPdf} />}
          {actividad.plantilla === 'trineo' && <BloqueEdicionActividad titulo="Carta de regalo (obligatoria)" descripcion="Cada alumno elegirá al niño de su carta y se comprometerá a entregar su regalo."><p className="text-sm">Las cartas incluyen nombre del niño, edad y deseo. Captúralas desde Cartas del Trineo en el detalle de la edición después de guardarla. La carta es independiente de las aportaciones de comida, globos u otros materiales.</p></BloqueEdicionActividad>}
          <BloqueEdicionActividad titulo="Aportaciones para la actividad" descripcion="Configura comida, globos u otros materiales. Estas aportaciones se registran aparte de cualquier regalo.">
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={datos.requiere_aportacion} onChange={(evento) => cambiar('requiere_aportacion', evento.target.checked)} />Aportación para la actividad obligatoria al registrarse</label>
            <>
              {edicion ? <><p className="text-sm">Para cambiar las opciones, abre Aportaciones en el detalle de la edición.</p>{cargando ? <p>Cargando aportaciones…</p> : errorCatalogo ? <div role="alert"><p>{errorCatalogo}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div> : catalogo.map((opcion) => <p className="text-sm" key={opcion.id_opcion}>{opcion.nombre} · mínimo {Number(opcion.cantidad_minima)} {opcion.unidad}{!opcion.activa && ' · retirada'}</p>)}</> : <>
                <p className="text-sm">Agrega las opciones disponibles y la cantidad mínima de cada una.</p>
                {opciones.map((opcion, indice) => <fieldset key={indice} className="min-w-0 space-y-3 rounded-lg border border-slate-400/25 p-3"><legend className="px-1 text-sm font-bold">Opción {indice + 1}</legend>
                  {[['nombre', 'Aportación *'], ['unidad', 'Unidad de medida *']].map(([clave, titulo]) => <label key={clave} className={labelCls}>{titulo}<input className={inputCls} value={opcion[clave]} required maxLength={clave === 'nombre' ? 160 : 60} onChange={(evento) => setOpciones((actuales) => actuales.map((actual, posicion) => posicion === indice ? { ...actual, [clave]: evento.target.value } : actual))} /></label>)}
                  <label className={labelCls}>Cantidad mínima *<input type="number" min="0.001" max={1000000} step="0.001" required className={inputCls} value={opcion.cantidad_minima} onChange={(evento) => setOpciones((actuales) => actuales.map((actual, posicion) => posicion === indice ? { ...actual, cantidad_minima: evento.target.value } : actual))} /></label>
                  <BotonAccion variant="outline" size="sm" onClick={() => setOpciones((actuales) => actuales.filter((_actual, posicion) => posicion !== indice))}>Quitar opción {indice + 1}</BotonAccion>
                </fieldset>)}
                <BotonAccion variant="outline" disabled={opciones.length >= 50} onClick={() => setOpciones((actuales) => [...actuales, { nombre: '', unidad: '', cantidad_minima: 1, descripcion: '' }])}>Agregar aportación</BotonAccion>
              </>}
            </>
          </BloqueEdicionActividad>
        </>}
      </>}
      {paso === 3 && <>
        {hayPendientes && <aside aria-label="Apartados pendientes" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-400/10 p-4 text-sm">
          <p className="font-bold">Hay datos pendientes. Puedes seguir revisando y volver a estos apartados para corregirlos.</p>
          {pendientes.map((errores, indice) => errores.length > 0 && <div key={indice} className="space-y-1"><button type="button" className="text-left font-bold underline underline-offset-4" onClick={() => irAPaso(indice)}>{indice + 1}. {PASOS_EDICION[indice].titulo}</button><ul className="list-disc pl-5 space-y-1">{errores.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul></div>)}
        </aside>}
        <VistaPreviaActividad actividad={actividad} edicion={entrada} catalogo={catalogo} />
        <p className="rounded-xl bg-amber-400/10 p-4 text-sm">{edicion?.estado === 'publicada' ? 'Guardar creará una propuesta. La versión aprobada seguirá visible hasta que Rectoría autorice el cambio.' : 'Se guardará como borrador. Después podrás enviarla a revisión desde su detalle.'}</p>
      </>}
    </fieldset>
    <fieldset disabled={ocupado || bloqueado} className="flex flex-wrap gap-3 border-t border-slate-400/25 pt-5">
      {paso > 0 && <BotonAccion variant="outline" onClick={() => irAPaso(paso - 1)}>Anterior</BotonAccion>}
      <BotonAccion type="submit">{guardando ? 'Guardando…' : paso < 3 ? ['Continuar a fechas', 'Continuar a inscripción', 'Revisar edición'][paso] : edicion?.estado === 'publicada' ? 'Guardar propuesta de edición' : 'Guardar edición'}</BotonAccion>
      {paso < 3 && <BotonAccion variant="outline" onClick={() => guardar(true)}>{edicion?.estado === 'publicada' ? 'Guardar propuesta y salir' : 'Guardar borrador y salir'}</BotonAccion>}
      <BotonAccion variant="outline" onClick={onCancelar}>Cancelar</BotonAccion>
    </fieldset>
  </form>;
}
