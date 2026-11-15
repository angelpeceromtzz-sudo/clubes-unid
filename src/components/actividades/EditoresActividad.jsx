import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { actividadService } from '../../services/actividad.service';
import { camposPlantillaActividad } from '../../../shared/actividades';
import { BotonAccion } from '../ui/BotonAccion';
import { NIVELES, PARTICIPACION, CUPOS_CLUB } from '../../constants/clubes';

export function FormularioActividad({ actividad, puedeCrearClub = false, tipoInicial='actividad', onGuardado, onCancelar }) {
  const [datos, setDatos] = useState({ tipo: tipoInicial, nombre: '', descripcion: '', categoria: '', url_imagen: '', mostrar_en_oferta: true, cupo_maximo: 10, participacion: 'mixta', niveles: [], lugar_actividades: '', password: '', ...actividad, ...actividad?.propuesta });
  const [archivo, setArchivo] = useState(null);
  const [idGuardado, setIdGuardado] = useState(actividad?.id_actividad || null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const { inputCls, labelCls } = useTheme();
  const bloqueado = actividad?.estado === 'pendiente' || actividad?.estado === 'archivada' || actividad?.estado_propuesta === 'pendiente';
  const cambiar = (clave, valor) => setDatos((actual) => ({ ...actual, [clave]: valor }));
  async function guardar(evento) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true); setError('');
    try {
      const resultado = await actividadService.guardarActividad(idGuardado, datos);
      setIdGuardado(resultado.id_actividad);
      if (archivo) await actividadService.subirImagen('/gestion/actividades/' + resultado.id_actividad + '/imagen', archivo);
      onGuardado(resultado.id_actividad);
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); } finally { setGuardando(false); }
  }
  return <form onSubmit={guardar} className="space-y-4" aria-label="Datos de la actividad"><fieldset disabled={bloqueado || guardando} className="space-y-4">
    {!actividad && puedeCrearClub ? <label className={labelCls}>Tipo de registro<select aria-label="Tipo de registro" className={inputCls} value={datos.tipo} disabled={Boolean(idGuardado)} onChange={(evento) => cambiar('tipo',evento.target.value)}><option value="actividad">Actividad</option><option value="club">Club</option></select></label> : <p className="text-sm font-semibold">{datos.tipo === 'club' ? 'Club' : 'Actividad'}</p>}
    <label className={labelCls}>{datos.tipo === 'club' ? 'Nombre del club *' : 'Nombre de la actividad *'}<input className={inputCls} value={datos.nombre} onChange={(evento) => cambiar('nombre', evento.target.value)} maxLength={160} required /></label>
    <label className={labelCls}>Descripción para Oferta *<textarea className={inputCls} value={datos.descripcion} onChange={(evento) => cambiar('descripcion', evento.target.value)} rows={4} maxLength={5000} required /></label>
    <label className={labelCls}>Categoría *<input className={inputCls} value={datos.categoria} onChange={(evento) => cambiar('categoria', evento.target.value)} maxLength={80} placeholder="Cultural, deportiva, servicio, taller…" required /></label>
    {datos.tipo === 'club' && <fieldset className="space-y-4"><legend className="font-bold mb-3">Configuración del club</legend>
      <div className="grid gap-4 sm:grid-cols-2"><label className={labelCls}>Cupo máximo<select aria-label="Cupo máximo" className={inputCls} value={datos.cupo_maximo} onChange={(evento) => cambiar('cupo_maximo',Number(evento.target.value))}>{CUPOS_CLUB.map((cupo)=><option key={cupo} value={cupo}>{cupo}</option>)}</select></label><label className={labelCls}>Participación<select aria-label="Participación" className={inputCls} value={datos.participacion} onChange={(evento) => cambiar('participacion',evento.target.value)}>{PARTICIPACION.map((opcion)=><option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}</select></label></div>
      <fieldset><legend className="text-sm font-semibold mb-2">Niveles de participación *</legend><div className="flex flex-wrap gap-4">{NIVELES.map((nivel)=><label key={nivel.id_nivel} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={datos.niveles.includes(nivel.id_nivel)} onChange={(evento)=>cambiar('niveles',evento.target.checked ? [...datos.niveles,nivel.id_nivel] : datos.niveles.filter((id)=>id!==nivel.id_nivel))}/>{nivel.etiqueta}</label>)}</div></fieldset>
      <label className={labelCls}>Lugar de actividades<input className={inputCls} value={datos.lugar_actividades || ''} maxLength={255} onChange={(evento)=>cambiar('lugar_actividades',evento.target.value)}/></label>
      {!idGuardado && <label className={labelCls}>Contraseña de administración *<input className={inputCls} type="password" autoComplete="off" value={datos.password} required onChange={(evento)=>cambiar('password',evento.target.value)}/></label>}
    </fieldset>}
    <label className={labelCls}>Imagen de presentación<input className={inputCls} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(evento) => setArchivo(evento.target.files?.[0] || null)} /></label>
    {datos.url_imagen && <img src={datos.url_imagen} alt="Imagen actual de la actividad" className="h-36 rounded-xl object-cover" />}
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={datos.mostrar_en_oferta} onChange={(evento) => cambiar('mostrar_en_oferta', evento.target.checked)} />Mostrar la descripción en Oferta</label>
    <div className="flex flex-wrap gap-3"><BotonAccion type="submit">{guardando ? 'Guardando…' : actividad?.estado === 'publicada' ? 'Guardar propuesta de cambios' : datos.tipo === 'club' ? 'Guardar club' : 'Guardar actividad'}</BotonAccion>{onCancelar && <BotonAccion variant="outline" onClick={onCancelar}>Cancelar</BotonAccion>}</div>
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

export function EditorCamposActividad({ campos, plantilla, onChange }) {
  const { inputCls, labelCls } = useTheme();
  const fijos = camposPlantillaActividad(plantilla).map((campo) => campo.clave);
  const cambiar = (indice, clave, valor) => onChange(campos.map((campo, posicion) => posicion === indice ? { ...campo, [clave]: valor } : campo));
  return <fieldset className="space-y-4"><legend className="font-bold mb-3">Preguntas del formulario</legend>
    <p className="text-sm">Nombre y matrícula se incluyen automáticamente. Agrega las preguntas que necesita esta edición.</p>
    {campos.map((campo, indice) => <div key={campo.clave} className="space-y-3 border-l-2 border-amber-400/40 pl-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>Pregunta<input className={inputCls} value={campo.etiqueta} maxLength={120} required onChange={(evento) => cambiar(indice, 'etiqueta', evento.target.value)} /></label><label className={labelCls}>Tipo de respuesta<select className={inputCls} value={campo.tipo} disabled={fijos.includes(campo.clave)} onChange={(evento) => cambiar(indice, 'tipo', evento.target.value)}><option value="texto">Texto breve</option><option value="numero">Número entero</option><option value="seleccion">Lista de opciones</option><option value="licenciatura">Catálogo de licenciaturas</option></select></label></div>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={campo.obligatorio} disabled={fijos.includes(campo.clave)} onChange={(evento) => cambiar(indice, 'obligatorio', evento.target.checked)} />Respuesta obligatoria</label>
      {campo.tipo === 'seleccion' && <label className={labelCls}>Opciones, una por línea<textarea className={inputCls} value={campo.textoOpciones ?? (campo.opciones || []).join('\n')} rows={3} onChange={(evento) => cambiar(indice, 'textoOpciones', evento.target.value)} placeholder={campo.clave === 'talla' ? 'Escribe las tallas disponibles para esta edición' : 'Una opción por línea'} /></label>}
      {campo.tipo === 'numero' && <div className="grid gap-3 sm:grid-cols-2">{[['minimo', 'Mínimo'], ['maximo', 'Máximo']].map(([clave, titulo]) => <label className={labelCls} key={clave}>{titulo}<input className={inputCls} type="number" disabled={campo.clave === 'edad' && fijos.includes('edad')} value={campo[clave] ?? ''} onChange={(evento) => cambiar(indice, clave, evento.target.value)} /></label>)}</div>}
      {!fijos.includes(campo.clave) && <BotonAccion variant="outline" size="sm" onClick={() => onChange(campos.filter((_item, posicion) => posicion !== indice))}>Quitar pregunta</BotonAccion>}
    </div>)}
    <BotonAccion variant="outline" onClick={() => onChange([...campos, { clave: 'pregunta_' + Date.now(), etiqueta: '', tipo: 'texto', obligatorio: false, opciones: [] }])} disabled={campos.length >= 25}>Agregar pregunta</BotonAccion>
  </fieldset>;
}

export function AccionesRevisionActividad({ tipo, entidad, puedeAprobar, operar, bloqueoPublicacion='' }) {
  const [motivo, setMotivo] = useState('');
  const { inputCls, labelCls } = useTheme();
  const id = entidad.id_actividad && tipo === 'actividades' ? entidad.id_actividad : entidad.id_edicion;
  const estado = entidad.estado_propuesta || entidad.estado;
  const hayCambios = entidad.estado !== 'publicada' || Boolean(entidad.propuesta);
  if (entidad.estado === 'archivada') return puedeAprobar ? <BotonAccion variant="outline" onClick={() => operar(() => actividadService.archivar(tipo, id, false))}>Restaurar como borrador</BotonAccion> : <p>Esta publicación está archivada.</p>;
  return <div className="space-y-3">
    {puedeAprobar && entidad.estado === 'publicada' && <BotonAccion variant="outline" onClick={() => operar(() => actividadService.archivar(tipo, id, true))}>Archivar publicación</BotonAccion>}
    {entidad.propuesta && <p className="text-sm">La versión publicada sigue visible mientras se revisan estos cambios.</p>}
    {entidad.motivo_rechazo && <p className="text-sm text-amber-700 dark:text-amber-300">Observaciones: {entidad.motivo_rechazo}</p>}
    {hayCambios && estado !== 'pendiente' && <BotonAccion variant="outline" onClick={() => operar(() => actividadService.revision(tipo, id))}>Enviar a revisión</BotonAccion>}
    {estado === 'pendiente' && <div className="space-y-3">{!puedeAprobar && <BotonAccion variant="outline" onClick={() => operar(() => actividadService.revision(tipo, id, true))}>Retirar de revisión</BotonAccion>}{puedeAprobar && <>{bloqueoPublicacion && <p className="text-sm text-amber-700 dark:text-amber-300">{bloqueoPublicacion}</p>}<BotonAccion disabled={Boolean(bloqueoPublicacion)} onClick={() => operar(() => actividadService.decidir(tipo, id, true))}>Aprobar y publicar</BotonAccion><label className={labelCls}>Cambios solicitados<textarea className={inputCls} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={1000} placeholder="Indica qué debe corregir el responsable" /></label><BotonAccion variant="outline" disabled={!motivo.trim()} onClick={() => operar(() => actividadService.decidir(tipo, id, false, motivo))}>Solicitar cambios</BotonAccion></>}</div>}
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
