import { useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { actividadService } from '../../services/actividad.service';
import { camposPlantillaActividad, esFormatoMegamisiones } from '../../../shared/actividades';
import { BotonAccion } from '../ui/BotonAccion';
import { NIVELES, PARTICIPACION, CUPOS_CLUB } from '../../constants/clubes';
import { gruposPreguntasMisiones } from '../../constants/preguntasMisiones';
import { quitarPreguntaMisiones, recuperarPreguntaMisiones } from '../../utils/preguntasMisiones';

export function FormularioActividad({ actividad, puedeCrearClub = false, puedePublicar = false, tipoInicial='actividad', onGuardado, onCancelar }) {
  const [datos, setDatos] = useState({ tipo: tipoInicial, nombre: '', descripcion: '', categoria: '', url_imagen: '', mostrar_en_oferta: true, cupo_maximo: 10, participacion: 'mixta', niveles: [], lugar_actividades: '', password: '', ...actividad, ...actividad?.propuesta });
  const [archivo, setArchivo] = useState(null);
  const [idGuardado, setIdGuardado] = useState(actividad?.id_actividad || null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const archivoRef = useRef(null);
  const { inputCls, tema } = useTheme();
  const labelCls = 'block space-y-2 text-sm font-semibold ' + tema.title;
  const publicacionDirecta = puedePublicar && datos.tipo === 'actividad';
  const bloqueado = actividad?.estado === 'archivada' || (!publicacionDirecta && (actividad?.estado === 'pendiente' || actividad?.estado_propuesta === 'pendiente'));
  const cambiar = (clave, valor) => setDatos((actual) => ({ ...actual, [clave]: valor }));
  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;
    const publicar = publicacionDirecta && evento.nativeEvent.submitter?.value !== 'borrador';
    setGuardando(true); setError('');
    let etapa = 'guardar';
    try {
      const resultado = await actividadService.guardarActividad(idGuardado, datos);
      setIdGuardado(resultado.id_actividad);
      if (archivo) {
        etapa = 'imagen';
        const portada = await actividadService.subirImagen('/gestion/actividades/' + resultado.id_actividad + '/imagen', archivo);
        setDatos((actual) => ({ ...actual, url_imagen: portada.propuesta?.url_imagen || portada.url_imagen }));
        setArchivo(null);
        if (archivoRef.current) archivoRef.current.value = '';
      }
      if (publicar) {
        etapa = 'publicar';
        await actividadService.publicar('actividades', resultado.id_actividad);
      }
      onGuardado(resultado.id_actividad, publicar ? actividad?.estado === 'publicada' ? 'Cambios publicados.' : 'Actividad publicada.' : 'Borrador guardado.');
    } catch (fallo) {
      const detalle = fallo.mensajeServidor || fallo.message;
      setError(etapa === 'guardar' ? detalle : 'El borrador está guardado. ' + detalle + ' Puedes volver a intentarlo.');
    } finally { setGuardando(false); }
  }
  return <form onSubmit={guardar} className="space-y-4" aria-label="Datos de la actividad"><fieldset disabled={bloqueado || guardando} className="space-y-4">
    {!actividad && puedeCrearClub && <label className={labelCls}>Tipo de registro<select aria-label="Tipo de registro" className={inputCls} value={datos.tipo} disabled={Boolean(idGuardado)} onChange={(evento) => cambiar('tipo',evento.target.value)}><option value="actividad">Actividad</option><option value="club">Club</option></select></label>}
    <label className={labelCls}>{datos.tipo === 'club' ? 'Nombre del club *' : 'Nombre de la actividad *'}<input className={inputCls} value={datos.nombre} onChange={(evento) => cambiar('nombre', evento.target.value)} maxLength={160} required /></label>
    <label className={labelCls}>Descripción *<textarea className={inputCls} value={datos.descripcion} onChange={(evento) => cambiar('descripcion', evento.target.value)} rows={4} maxLength={5000} required /></label>
    <label className={labelCls}>Categoría *<input className={inputCls} value={datos.categoria} onChange={(evento) => cambiar('categoria', evento.target.value)} maxLength={80} placeholder="Cultural, deportiva, servicio, taller…" required /></label>
    {datos.tipo === 'club' && <fieldset className="space-y-4"><legend className="font-bold mb-3">Configuración del club</legend>
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelCls}>Cupo máximo<select aria-label="Cupo máximo" className={inputCls} value={datos.cupo_maximo} onChange={(evento) => cambiar('cupo_maximo',Number(evento.target.value))}>{CUPOS_CLUB.map((cupo)=><option key={cupo} value={cupo}>{cupo}</option>)}</select></label><label className={labelCls}>Participación<select aria-label="Participación" className={inputCls} value={datos.participacion} onChange={(evento) => cambiar('participacion',evento.target.value)}>{PARTICIPACION.map((opcion)=><option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}</select></label></div>
      <fieldset><legend className="text-sm font-semibold mb-2">Niveles de participación *</legend><div className="flex flex-wrap gap-4">{NIVELES.map((nivel)=><label key={nivel.id_nivel} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={datos.niveles.includes(nivel.id_nivel)} onChange={(evento)=>cambiar('niveles',evento.target.checked ? [...datos.niveles,nivel.id_nivel] : datos.niveles.filter((id)=>id!==nivel.id_nivel))}/>{nivel.etiqueta}</label>)}</div></fieldset>
      <label className={labelCls}>Lugar de actividades<input className={inputCls} value={datos.lugar_actividades || ''} maxLength={255} onChange={(evento)=>cambiar('lugar_actividades',evento.target.value)}/></label>
      {!idGuardado && <label className={labelCls}>Contraseña de administración *<input className={inputCls} type="password" autoComplete="off" value={datos.password} required onChange={(evento)=>cambiar('password',evento.target.value)}/></label>}
    </fieldset>}
    <label className={labelCls}>Imagen de presentación<input ref={archivoRef} className={inputCls} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(evento) => setArchivo(evento.target.files?.[0] || null)} /></label>
    {datos.url_imagen && <img src={datos.url_imagen} alt="Imagen actual de la actividad" className="h-36 rounded-xl object-cover" />}
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={datos.mostrar_en_oferta} onChange={(evento) => cambiar('mostrar_en_oferta', evento.target.checked)} />Mostrar en Oferta</label>
    <div className="flex flex-wrap gap-3">
      {publicacionDirecta && <BotonAccion type="submit" value="publicar">{guardando ? 'Guardando…' : 'Guardar y publicar'}</BotonAccion>}
      <BotonAccion type="submit" value="borrador" variant={publicacionDirecta ? 'outline' : 'primary'}>{guardando && !publicacionDirecta ? 'Guardando…' : actividad?.estado === 'publicada' ? 'Guardar cambios como borrador' : 'Guardar borrador'}</BotonAccion>
      {onCancelar && <BotonAccion variant="outline" onClick={onCancelar}>Cancelar</BotonAccion>}
    </div>
  </fieldset>{error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}</form>;
}

export function AsignarEncargadoActividad({ actividad, onGuardado }) {
  const { inputCls, labelCls } = useTheme();
  const [busqueda, setBusqueda] = useState('');
  const [opciones, setOpciones] = useState([]);
  const [seleccionado, setSeleccionado] = useState('');
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState(false);
  async function buscar() {
    setPendiente(true); setError('');
    try { setOpciones(await actividadService.buscarEncargados(busqueda,actividad.tipo)); }
    catch (fallo) { setError(fallo.message); } finally { setPendiente(false); }
  }
  async function asignar() {
    setPendiente(true); setError('');
    try { await actividadService.asignarEncargado(actividad.id_actividad, Number(seleccionado)); onGuardado(); }
    catch (fallo) { setError(fallo.message); } finally { setPendiente(false); }
  }
  return <section className="space-y-3"><h3 className="font-bold">Responsable</h3><p className="text-sm">{actividad.responsable_nombre || 'Sin responsable asignado'}</p><div className="flex flex-wrap items-end gap-3"><label className={labelCls}>Buscar por nombre<input className={inputCls} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} maxLength={100} /></label><BotonAccion variant="outline" disabled={pendiente} onClick={buscar}>Buscar</BotonAccion></div>
    {opciones.length > 0 && <div className="flex flex-wrap items-end gap-3"><label className={labelCls}>Seleccionar encargado<select aria-label="Seleccionar encargado" className={inputCls} value={seleccionado} onChange={(evento) => setSeleccionado(evento.target.value)}><option value="">Selecciona una persona</option>{opciones.map((opcion) => <option key={opcion.id_usuario} value={opcion.id_usuario}>{opcion.nombre_completo}</option>)}</select></label><BotonAccion disabled={!seleccionado || pendiente} onClick={asignar}>Asignar encargado</BotonAccion></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

export function EditorCamposActividad({ campos, plantilla, configuracion, idEdicion, onChange }) {
  const { tema, inputCls, labelCls } = useTheme();
  const [preguntaRecuperada, setPreguntaRecuperada] = useState('');
  const [errorPreguntas, setErrorPreguntas] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState('');
  const esMisiones = plantilla === 'misiones';
  const nuevos = plantilla === 'misiones' && configuracion?.version === 2;
  const mega = esFormatoMegamisiones(configuracion);
  const preguntasBase = camposPlantillaActividad(plantilla, configuracion);
  const fijos = preguntasBase.map((campo) => campo.clave);
  const preguntasQuitadas = preguntasBase.filter((base) => !campos.some((campo) => campo.clave === base.clave));
  const opcionesFijas = nuevos ? ['tipo_sangre', 'rol_mision', 'alergias', 'participacion_previa', ...(mega ? ['sexo', 'campus', 'familia_unid', 'cuatrimestre', 'participaciones_veces'] : [])] : [];
  const cambiar = (indice, clave, valor) => onChange(campos.map((campo, posicion) => posicion === indice ? { ...campo, [clave]: valor } : campo));
  async function subirImagen(indice, archivo) {
    if (!archivo) return;
    if (!idEdicion) {
      setErrorPreguntas('Guarda primero la edición como borrador para poder subir imágenes.');
      return;
    }
    setSubiendoImagen(campos[indice].clave);
    setErrorPreguntas('');
    try {
      const resultado = await actividadService.subirImagenCampo(idEdicion, campos[indice].clave, archivo);
      const actualizados = resultado.propuesta?.campos_registro || resultado.campos_registro;
      if (Array.isArray(actualizados)) onChange(actualizados);
    } catch (fallo) {
      setErrorPreguntas(fallo.mensajeServidor || fallo.message);
    } finally {
      setSubiendoImagen('');
    }
  }
  async function quitarImagen(indice) {
    if (!idEdicion) {
      cambiar(indice, 'imagen_url', undefined);
      return;
    }
    setSubiendoImagen(campos[indice].clave);
    setErrorPreguntas('');
    try {
      const resultado = await actividadService.eliminarImagenCampo(idEdicion, campos[indice].clave);
      const actualizados = resultado.propuesta?.campos_registro || resultado.campos_registro;
      if (Array.isArray(actualizados)) onChange(actualizados);
    } catch (fallo) {
      setErrorPreguntas(fallo.mensajeServidor || fallo.message);
    } finally {
      setSubiendoImagen('');
    }
  }
  const grupos = nuevos ? [...gruposPreguntasMisiones(configuracion), { titulo: 'Otras preguntas', descripcion: 'Preguntas adicionales de esta edición.', claves: campos.filter((campo) => !fijos.includes(campo.clave)).map((campo) => campo.clave) }] : [{ titulo: '', claves: campos.map((campo) => campo.clave) }];

  function pregunta(campo, indice) {
    return <fieldset key={campo.clave} className="min-w-0 space-y-3 rounded-xl border border-slate-400/25 p-4">
      <legend className="max-w-full px-1 text-sm font-bold">{indice + 1}. {campo.etiqueta || 'Nueva pregunta'}</legend>
      <div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>Pregunta<input className={inputCls} value={campo.etiqueta} maxLength={120} required onChange={(evento) => cambiar(indice, 'etiqueta', evento.target.value)} /></label><label className={labelCls}>Tipo de respuesta<select className={inputCls} value={campo.tipo} disabled={fijos.includes(campo.clave)} onChange={(evento) => cambiar(indice, 'tipo', evento.target.value)}><option value="texto">Texto breve</option><option value="texto_largo">Texto extenso</option><option value="numero">Número entero</option><option value="fecha">Fecha</option><option value="seleccion">Lista de opciones</option><option value="licenciatura">Catálogo de licenciaturas</option></select></label></div>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={campo.obligatorio} disabled={mega ? fijos.includes(campo.clave) : nuevos ? campo.clave === 'talla' || Boolean(campo.visible_si) : fijos.includes(campo.clave)} onChange={(evento) => cambiar(indice, 'obligatorio', evento.target.checked)} />Respuesta obligatoria{campo.visible_si ? ' cuando se muestre la pregunta' : ''}</label>
      {campo.ayuda && <p className={'text-sm ' + tema.subtitle}>{campo.ayuda}</p>}
      {campo.visible_si && <p className={'text-sm ' + tema.subtitle}>Se muestra cuando “{campos.find((item) => item.clave === campo.visible_si.campo)?.etiqueta}” {campo.visible_si.distinto !== undefined ? <>tenga una respuesta distinta de “{campo.visible_si.distinto}”</> : <>sea “{campo.visible_si.valor}”</>}.</p>}
      {campo.tipo === 'seleccion' && <label className={labelCls}>Opciones, una por línea<textarea className={inputCls} readOnly={opcionesFijas.includes(campo.clave)} value={campo.textoOpciones ?? (campo.opciones || []).join('\n')} rows={3} onChange={(evento) => cambiar(indice, 'textoOpciones', evento.target.value)} placeholder={campo.clave === 'talla' ? 'Escribe las tallas disponibles para esta edición' : 'Una opción por línea'} /></label>}
       {campo.tipo === 'numero' && <div className="grid gap-3 sm:grid-cols-2">{[['minimo', 'Mínimo'], ['maximo', 'Máximo']].map(([clave, titulo]) => <label className={labelCls} key={clave}>{titulo}<input className={inputCls} type="number" disabled={fijos.includes(campo.clave)} value={campo[clave] ?? ''} onChange={(evento) => cambiar(indice, clave, evento.target.value)} /></label>)}</div>}
       <div className="space-y-2">
         <label className={labelCls}>Imagen <span className={'font-normal ' + tema.subtitle}>(opcional)</span>
           <input className={inputCls} type="file" accept="image/jpeg,image/png,image/gif,image/webp" disabled={subiendoImagen === campo.clave} onChange={(evento) => { subirImagen(indice, evento.target.files?.[0]); evento.target.value = ''; }} />
         </label>
         {campo.imagen_url && <div className="flex flex-wrap items-start gap-3">
           <a href={campo.imagen_url} target="_blank" rel="noreferrer" aria-label="Abrir imagen completa"><img src={campo.imagen_url} alt={'Imagen para ' + (campo.etiqueta || 'la pregunta')} className="h-28 w-40 rounded-lg bg-slate-100 object-contain dark:bg-slate-800" /></a>
           <BotonAccion type="button" variant="outline" size="sm" disabled={subiendoImagen === campo.clave} onClick={() => quitarImagen(indice)}>{subiendoImagen === campo.clave ? 'Procesando…' : 'Quitar imagen'}</BotonAccion>
         </div>}
         {!idEdicion && <p className={'text-xs ' + tema.subtitle}>Guarda la edición para habilitar la carga de imágenes.</p>}
       </div>
       {(esMisiones || !fijos.includes(campo.clave)) && <BotonAccion variant="outline" size="sm" onClick={() => { setErrorPreguntas(''); onChange(esMisiones ? quitarPreguntaMisiones(campos, campo.clave) : campos.filter((_item, posicion) => posicion !== indice)); }}>Quitar pregunta</BotonAccion>}
    </fieldset>;
  }

  return <fieldset className="min-w-0 space-y-5"><legend className="sr-only">Configurar preguntas del formulario</legend>
    <p className={'text-sm ' + tema.subtitle}>{esMisiones ? 'Conserva solo las preguntas que necesita esta edición. Puedes quitar cualquiera, incluida la talla. Al quitar una pregunta también se quitan las que dependen de su respuesta. Los datos de identificación del participante se incluyen automáticamente.' : 'Nombre y matrícula se incluyen automáticamente. Agrega las preguntas que necesita esta edición.'}</p>
    {grupos.map((grupo) => {
      const elementos = campos.map((campo, indice) => ({ campo, indice })).filter(({ campo }) => grupo.claves.includes(campo.clave));
      if (!elementos.length) return null;
      return <section key={grupo.titulo || 'generales'} aria-label={grupo.titulo || 'Preguntas de la edición'} className="space-y-4">
        {grupo.titulo && <header className="space-y-1"><h5 className="font-bold">{grupo.titulo}</h5><p className={'text-sm ' + tema.subtitle}>{grupo.descripcion}</p></header>}
        {elementos.map(({ campo, indice }) => pregunta(campo, indice))}
      </section>;
    })}
    {esMisiones && preguntasQuitadas.length > 0 && <div className="space-y-3 rounded-xl border border-slate-400/25 p-4">
      <label className={labelCls}>Recuperar una pregunta del formato<select aria-label="Recuperar una pregunta del formato" className={inputCls} value={preguntaRecuperada} onChange={(evento) => setPreguntaRecuperada(evento.target.value)}><option value="">Selecciona una pregunta</option>{preguntasQuitadas.map((campo) => <option key={campo.clave} value={campo.clave}>{campo.etiqueta}</option>)}</select></label>
      <BotonAccion variant="outline" disabled={!preguntaRecuperada} onClick={() => {
        try { onChange(recuperarPreguntaMisiones(campos, preguntaRecuperada, preguntasBase)); setPreguntaRecuperada(''); setErrorPreguntas(''); }
        catch (error) { setErrorPreguntas(error.message); }
      }}>Recuperar pregunta</BotonAccion>
      <p className={'text-xs ' + tema.subtitle}>Si depende de otra pregunta, también se recuperará la pregunta anterior.</p>
    </div>}
    {errorPreguntas && <p role="alert" className="text-red-600 dark:text-red-400">{errorPreguntas}</p>}
    <BotonAccion variant="outline" onClick={() => onChange([...campos, { clave: 'pregunta_' + Date.now(), etiqueta: '', tipo: 'texto', obligatorio: false, opciones: [] }])} disabled={campos.length >= 25}>Agregar pregunta</BotonAccion>
  </fieldset>;
}

export function AccionesRevisionActividad({ tipo, entidad, puedeAprobar, puedePublicar=false, puedeArchivar=puedeAprobar, operar, bloqueoPublicacion='' }) {
  const [motivo, setMotivo] = useState('');
  const { inputCls, labelCls } = useTheme();
  const id = entidad.id_actividad && tipo === 'actividades' ? entidad.id_actividad : entidad.id_edicion;
  const estado = entidad.estado_propuesta || entidad.estado;
  const hayCambios = entidad.estado !== 'publicada' || Boolean(entidad.propuesta);
  if (entidad.estado === 'archivada') return puedeArchivar ? <BotonAccion variant="outline" onClick={() => operar(() => actividadService.archivar(tipo, id, false))}>Restaurar como borrador</BotonAccion> : <p>Esta publicación está archivada.</p>;
  return <div className="space-y-3">
    {puedeArchivar && entidad.estado === 'publicada' && <BotonAccion variant="outline" onClick={() => operar(() => actividadService.archivar(tipo, id, true))}>Archivar publicación</BotonAccion>}
    {entidad.propuesta && <p className="text-sm">{puedePublicar ? 'Los cambios se verán al publicar. La versión actual sigue visible.' : 'La versión publicada sigue visible mientras se revisan estos cambios.'}</p>}
    {entidad.motivo_rechazo && <p className="text-sm text-amber-700 dark:text-amber-300">Observaciones: {entidad.motivo_rechazo}</p>}
    {hayCambios && puedePublicar && <>
      {bloqueoPublicacion && <p className="text-sm text-amber-700 dark:text-amber-300">{bloqueoPublicacion}</p>}
      <BotonAccion disabled={Boolean(bloqueoPublicacion)} onClick={() => operar(() => actividadService.publicar(tipo, id), entidad.estado === 'publicada' ? 'Cambios publicados.' : tipo === 'actividades' ? 'Actividad publicada.' : 'Edición publicada.')}>{entidad.estado === 'publicada' ? 'Publicar cambios' : 'Publicar'}</BotonAccion>
    </>}
    {hayCambios && !puedePublicar && estado !== 'pendiente' && <BotonAccion variant="outline" onClick={() => operar(() => actividadService.revision(tipo, id), 'Enviado a revisión.')}>Enviar a revisión</BotonAccion>}
    {estado === 'pendiente' && <div className="space-y-3">
      {!puedeAprobar && !puedePublicar && <BotonAccion variant="outline" onClick={() => operar(() => actividadService.revision(tipo, id, true))}>Retirar de revisión</BotonAccion>}
      {puedeAprobar && <>
        {!puedePublicar && <>{bloqueoPublicacion && <p className="text-sm text-amber-700 dark:text-amber-300">{bloqueoPublicacion}</p>}<BotonAccion disabled={Boolean(bloqueoPublicacion)} onClick={() => operar(() => actividadService.decidir(tipo, id, true))}>Aprobar y publicar</BotonAccion></>}
        <details><summary className="cursor-pointer text-sm font-semibold">Solicitar cambios</summary><div className="space-y-3 pt-3"><label className={labelCls}>Cambios solicitados<textarea className={inputCls} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={1000} placeholder="Indica qué debe corregir el responsable" /></label><BotonAccion variant="outline" disabled={!motivo.trim()} onClick={() => operar(() => actividadService.decidir(tipo, id, false, motivo), 'Cambios solicitados.')}>Solicitar cambios</BotonAccion></div></details>
      </>}
    </div>}
  </div>;
}

export function FormularioOpcionAporte({ idEdicion, opcion, onGuardado, onCancelar }) {
  const { inputCls, labelCls } = useTheme();
  const [datos, setDatos] = useState({ nombre: '', descripcion: '', unidad: '', cantidad_minima: 1, ...opcion });
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState(false);
  async function guardar(evento) {
    evento.preventDefault(); setPendiente(true); setError('');
    try { await actividadService.guardarOpcion(idEdicion, opcion?.id_opcion, datos); onGuardado(); }
    catch (fallo) { setError(fallo.mensajeServidor || fallo.message); } finally { setPendiente(false); }
  }
  return <form aria-label="Configurar aportación" onSubmit={guardar} className="space-y-3"><fieldset disabled={pendiente} className="space-y-3">
    {[['nombre', 'Aportación'], ['unidad', 'Unidad de medida']].map(([clave, titulo]) => <label key={clave} className={labelCls}>{titulo} *<input className={inputCls} value={datos[clave]} maxLength={clave === 'nombre' ? 160 : 60} required onChange={(evento) => setDatos((actual) => ({ ...actual, [clave]: evento.target.value }))} /></label>)}
    <label className={labelCls}>Cantidad mínima *<input className={inputCls} type="number" min="0.001" max={1000000} step="0.001" value={datos.cantidad_minima} required onChange={(evento) => setDatos((actual) => ({ ...actual, cantidad_minima: evento.target.value }))} /></label>
    <label className={labelCls}>Indicaciones<textarea className={inputCls} value={datos.descripcion} maxLength={1000} onChange={(evento) => setDatos((actual) => ({ ...actual, descripcion: evento.target.value }))} /></label>
    <div className="flex flex-wrap gap-3"><BotonAccion type="submit">Guardar aportación</BotonAccion>{onCancelar && <BotonAccion variant="outline" onClick={onCancelar}>Cancelar</BotonAccion>}</div>
  </fieldset>{error && <p role="alert">{error}</p>}</form>;
}
