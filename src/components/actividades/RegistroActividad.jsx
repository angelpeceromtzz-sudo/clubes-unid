import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';
import { actividadService } from '../../services/actividad.service';
import { validarRespuestasActividad, validarAportacionesActividad } from '../../../shared/actividades';
import { BotonAccion } from '../ui/BotonAccion';
import { EstadoActividad } from './ActividadUI';

export function RegistroActividad({ edicion, registro, onGuardado }) {
  const { usuario } = useAutenticacion();
  const { tema, inputCls, labelCls } = useTheme();
  const { licenciaturas, loading, error: errorLicenciaturas, recargar } = useLicenciaturas();
  const confirmado = registro?.estado === 'confirmado';
  const [editando, setEditando] = useState(!confirmado);
  const [matricula, setMatricula] = useState(usuario.institutional_id || registro?.matricula || '');
  const [respuestas, setRespuestas] = useState(registro?.respuestas || {});
  const [aportaciones, setAportaciones] = useState((registro?.aportaciones || []).filter((aporte) => aporte.estado !== 'cancelada').map((aporte) => ({ id_opcion: aporte.id_opcion, cantidad: aporte.cantidad })));
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const abierta = edicion.estado_registro === 'abierta';
  const campos = confirmado ? registro.formulario_snapshot : edicion.campos_registro;
  const catalogo = [...edicion.catalogo];
  for (const previo of registro?.aportaciones || []) {
    if (previo.estado !== 'cancelada' && !catalogo.some((opcion) => opcion.id_opcion === previo.id_opcion)) catalogo.push({ ...previo, activa: false });
  }
  const hayLicenciatura = campos.some((campo) => campo.tipo === 'licenciatura');
  const responder = (clave, valor) => setRespuestas((actual) => ({ ...actual, [clave]: valor }));

  async function guardar(evento) {
    evento.preventDefault();
    if (pendiente) return;
    setError('');
    try {
      validarRespuestasActividad(campos, respuestas);
      validarAportacionesActividad(aportaciones, catalogo, edicion.requiere_aportacion, registro?.aportaciones || []);
      setPendiente(true);
      await actividadService.guardarRegistro(edicion.id_edicion, { matricula, respuestas, aportaciones });
      onGuardado('Tu inscripción está confirmada.');
    } catch (fallo) { setError(fallo.mensajeServidor || fallo.message); } finally { setPendiente(false); }
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
    <dl className="grid gap-3 sm:grid-cols-2">{campos.map((campo) => <div key={campo.clave}><dt className={'text-sm ' + tema.subtitle}>{campo.etiqueta}</dt><dd className="font-semibold">{campo.tipo === 'licenciatura' ? licenciaturas.find((item) => item.id_licenciatura === Number(registro.respuestas[campo.clave]))?.nombre || 'Sin especificar' : registro.respuestas[campo.clave] || 'Sin especificar'}</dd></div>)}</dl>
    {registro.aportaciones.filter((aporte) => aporte.estado !== 'cancelada').map((aporte) => <p key={aporte.id_aportacion}>{aporte.nombre}: {Number(aporte.cantidad)} {aporte.unidad} · {aporte.estado}</p>)}
    {abierta && <div className="flex flex-wrap gap-3"><BotonAccion onClick={() => setEditando(true)}>Editar mi registro</BotonAccion><BotonAccion variant="outline" onClick={() => setCancelando(true)}>Cancelar inscripción</BotonAccion></div>}
    {cancelando && <div className="space-y-3" role="alert"><p>¿Confirmas la cancelación de tu inscripción? Las aportaciones recibidas y cualquier asistencia registrada conservarán su historial.</p><div className="flex flex-wrap gap-3"><BotonAccion variant="danger" disabled={pendiente} onClick={cancelar}>Confirmar cancelación</BotonAccion><BotonAccion variant="outline" disabled={pendiente} onClick={() => setCancelando(false)}>Conservar mi inscripción</BotonAccion></div></div>}
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
  </section>;

  if (!abierta) return <p className={tema.subtitle}>{edicion.estado_registro === 'proxima' ? 'El registro estará disponible durante el periodo de inscripción.' : 'Las inscripciones de esta edición están cerradas.'}</p>;

  return <form onSubmit={guardar} className="space-y-5" aria-label="Registro a la actividad">
    {registro?.estado && <EstadoActividad estado={registro.estado} />}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={labelCls}>Nombre completo<input className={inputCls} value={usuario.nombre_completo || ''} readOnly /></label>
      <label className={labelCls}>Matrícula *<input className={inputCls} value={matricula} onChange={(evento) => setMatricula(evento.target.value)} readOnly={Boolean(usuario.institutional_id)} inputMode="numeric" pattern="[0-9]+" maxLength={30} required /></label>
      {campos.map((campo) => <label className={labelCls} key={campo.clave}>{campo.etiqueta}{campo.obligatorio ? ' *' : ' (opcional)'}
        {campo.tipo === 'seleccion' || campo.tipo === 'licenciatura' ? <select aria-label={campo.etiqueta + (campo.obligatorio ? ' *' : ' (opcional)')} className={inputCls} value={respuestas[campo.clave] ?? ''} required={campo.obligatorio} disabled={campo.tipo === 'licenciatura' && loading} onChange={(evento) => responder(campo.clave, evento.target.value)}>
          <option value="">Selecciona una opción</option>
          {(campo.tipo === 'licenciatura' ? licenciaturas.map((item) => ({ valor: item.id_licenciatura, nombre: item.nombre })) : campo.opciones.map((opcion) => ({ valor: opcion, nombre: opcion }))).map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.nombre}</option>)}
        </select> : <input className={inputCls} value={respuestas[campo.clave] ?? ''} onChange={(evento) => responder(campo.clave, evento.target.value)} type={campo.tipo === 'numero' ? 'number' : 'text'} min={campo.minimo} max={campo.maximo} step={campo.tipo === 'numero' ? 1 : undefined} maxLength={500} required={campo.obligatorio} />}
      </label>)}
    </div>
    {hayLicenciatura && errorLicenciaturas && <div role="alert"><p>No se pudieron cargar las licenciaturas.</p><BotonAccion variant="outline" onClick={recargar}>Volver a cargar licenciaturas</BotonAccion></div>}
    {(edicion.requiere_aportacion || catalogo.length > 0) && <fieldset className="space-y-4"><legend className={'text-lg font-bold mb-3 ' + tema.title}>Tu aportación{edicion.requiere_aportacion ? ' (obligatoria)' : ' (opcional)'}</legend>
      <p className={'text-sm ' + tema.subtitle}>Selecciona lo que te comprometes a aportar. El encargado registrará la recepción.</p>
      {catalogo.map((opcion) => {
        const seleccionada = aportaciones.find((aporte) => aporte.id_opcion === opcion.id_opcion);
        const anterior = registro?.aportaciones.find((aporte) => aporte.id_opcion === opcion.id_opcion && aporte.estado !== 'cancelada');
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
    </fieldset>}
    {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-3"><BotonAccion type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : confirmado ? 'Guardar cambios' : 'Confirmar inscripción'}</BotonAccion>{confirmado && <BotonAccion variant="outline" onClick={() => setEditando(false)}>Volver a mi registro</BotonAccion>}</div>
  </form>;
}
