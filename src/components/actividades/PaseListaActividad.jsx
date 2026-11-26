import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useActividadRecurso } from '../../hooks/useActividadRecurso';
import { actividadService } from '../../services/actividad.service';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';
import { EstadoActividad, FechaActividad } from './ActividadUI';
import { ResumenAsistenciaActividad } from './AsistenciaActividad';

export function PaseListaActividad({ edicion }) {
  const { usuario } = useAutenticacion();
  const { tema, cardCls, inputCls, labelCls } = useTheme();
  const { datos, cargando, error, recargar } = useActividadRecurso(
    '/gestion/ediciones/' + edicion.id_edicion + '/asistencia', usuario.id_usuario || usuario.id, 15000);
  const [accesoLocal, setAccesoLocal] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [correccion, setCorreccion] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [pendiente, setPendiente] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function generarAcceso() {
    if (pendiente) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try { setAccesoLocal(await actividadService.generarAccesoAsistencia(edicion.id_edicion)); }
    catch (fallo) { setErrorOperacion(fallo.message); }
    finally { setPendiente(false); }
  }

  async function guardarCorreccion(evento) {
    evento.preventDefault();
    if (pendiente || !correccion) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try {
      await actividadService.corregirAsistencia(edicion.id_edicion, correccion.id, correccion.estado, motivo);
      setCorreccion(null); setMotivo(''); setMensaje('Cambio de asistencia guardado.'); recargar();
    } catch (fallo) { setErrorOperacion(fallo.message); }
    finally { setPendiente(false); }
  }

  if (cargando) return <Spinner />;
  if (error) return <div role="alert" className="space-y-3"><p>{error}</p><BotonAccion onClick={recargar}>Volver a intentar</BotonAccion></div>;
  if (!datos.requiere_registro) return <p>El pase de lista requiere una edición con inscripciones.</p>;
  const codigo = accesoLocal?.codigo || datos.acceso?.codigo;
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, '');
  const enlace = codigo ? base + '/actividades/asistencia/' + edicion.id_edicion + '?codigo=' + codigo : '';
  const visibles = datos.registros.filter((registro) =>
    (registro.nombre_completo + ' ' + (registro.matricula || '') + ' ' + (registro.folio || '')).toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));
  const origenes = { qr: 'QR', codigo: 'Código', manual: 'Registro manual' };

  return <section className="space-y-6" aria-label="Pase de lista de la edición">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2"><h3 className={'text-xl font-bold ' + tema.title}>Pase de lista</h3>
        <p className={'text-sm ' + tema.subtitle}>Una asistencia por persona durante las fechas de esta edición. La lista se actualiza automáticamente.</p>
        <p className="text-sm"><FechaActividad fecha={edicion.fecha_inicio} />{edicion.fecha_fin && edicion.fecha_fin !== edicion.fecha_inicio && <> al <FechaActividad fecha={edicion.fecha_fin} /></>}</p>
      </div>
      <BotonAccion size="sm" variant="outline" onClick={recargar} disabled={pendiente}>Actualizar lista</BotonAccion>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[[datos.totales.inscritos, 'Inscripciones confirmadas'], [datos.totales.asistentes, 'Asistencias registradas'], [datos.totales.sin_asistencia, 'Inscritos sin asistencia']].map(([total, etiqueta]) =>
        <div key={etiqueta} className={'rounded-xl border p-4 ' + cardCls}><p className={'text-2xl font-bold ' + tema.title}>{total}</p><p className={'text-sm ' + tema.subtitle}>{etiqueta}</p></div>)}
    </div>
    {codigo ? <div className={'flex flex-col items-start gap-5 rounded-xl border p-4 sm:flex-row ' + cardCls}>
      <div className="max-w-full rounded-lg bg-white p-3"><QRCodeSVG value={enlace} size={208} marginSize={2} level="H" title={'Registrar asistencia a ' + edicion.nombre} imageSettings={{ src: '/branding/lobounid.png', width: 80, height: 68 }} style={{ maxWidth: '100%', height: 'auto' }} /></div>
      <div className="min-w-0 space-y-3"><p className="font-bold">Código de asistencia</p>
        <p className="font-mono text-2xl font-bold tracking-widest" aria-label="Código de asistencia">{codigo.slice(0, 4)} {codigo.slice(4)}</p>
        <p className={'text-sm ' + tema.subtitle}>Los inscritos pueden escanear este QR o escribir el código en Mis actividades.</p>
        {datos.disponibilidad !== 'disponible' && <p className="text-sm">{datos.disponibilidad === 'proxima' ? 'El registro se habilitará al comenzar las fechas de la edición.' : datos.disponibilidad === 'finalizada' ? 'El periodo de registro terminó. Puedes realizar correcciones manuales.' : 'El registro está deshabilitado porque la actividad o su edición no están publicadas.'}</p>}
        <BotonAccion size="sm" variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(enlace); setMensaje('Enlace copiado.'); }
          catch { setErrorOperacion('No se pudo copiar el enlace. Puedes compartir el código que aparece arriba.'); }
        }}>Copiar enlace</BotonAccion>
      </div>
    </div> : <div className="space-y-3"><p className={'text-sm ' + tema.subtitle}>Genera el acceso una vez y compártelo en el lugar de la actividad. Se conservará para esta edición.</p>
      <BotonAccion onClick={generarAcceso} disabled={pendiente || datos.disponibilidad === 'no_disponible'}>{pendiente ? 'Preparando…' : 'Mostrar QR y código'}</BotonAccion>
      {datos.disponibilidad === 'no_disponible' && <p className={'text-sm ' + tema.subtitle}>Publica la actividad y su edición para generar el acceso.</p>}
    </div>}
    {mensaje && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{mensaje}</p>}
    {errorOperacion && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorOperacion}</p>}
    <label className={labelCls}>Buscar en el pase de lista<input className={inputCls + ' mt-2'} value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre, matrícula o folio" /></label>
    <div className="space-y-4">
      {!visibles.length && <p className={tema.subtitle}>No hay participantes que coincidan.</p>}
      {visibles.map((registro) => <article key={registro.id_registro} className={'space-y-3 rounded-xl border p-4 ' + cardCls}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className={'break-words font-bold ' + tema.title}>{registro.nombre_completo}</h4><p className={'text-sm break-words ' + tema.subtitle}>{registro.tipo_participante==='invitado' ? 'Invitado · ' + registro.folio : 'Matrícula ' + registro.matricula}</p></div><EstadoActividad estado={registro.estado_inscripcion} /></div>
        <ResumenAsistenciaActividad asistencia={registro.asistencia} />
        {registro.asistencia && <div className={'space-y-1 text-xs ' + tema.subtitle}>
          <p>{origenes[registro.asistencia.origen]}{registro.asistencia.actor_nombre ? ' · ' + registro.asistencia.actor_nombre : ''}</p>
          {registro.asistencia.motivo_correccion && <p className="break-words">Motivo: {registro.asistencia.motivo_correccion}</p>}
        </div>}
        {!registro.cuenta_activa && <p className={'text-xs ' + tema.subtitle}>Cuenta desactivada</p>}
        {correccion?.id === registro.id_registro ? <form className="space-y-3" onSubmit={guardarCorreccion}>
          <p className="text-sm font-semibold">{correccion.estado === 'presente' ? 'Registrar llegada manualmente' : 'Quitar marca de asistencia'}</p>
          <label className={labelCls}>Motivo<textarea className={inputCls + ' mt-2'} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={500} required disabled={pendiente} /></label>
          <div className="flex flex-wrap gap-3"><BotonAccion type="submit" size="sm" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar corrección'}</BotonAccion><BotonAccion size="sm" variant="outline" disabled={pendiente} onClick={() => setCorreccion(null)}>Cancelar</BotonAccion></div>
        </form> : <BotonAccion size="sm" variant="outline" disabled={pendiente || (registro.asistencia?.estado !== 'presente' && (registro.estado_inscripcion !== 'confirmado' || !registro.cuenta_activa))}
          onClick={() => { setCorreccion({ id: registro.id_registro, estado: registro.asistencia?.estado === 'presente' ? 'anulada' : 'presente' }); setMotivo(''); setErrorOperacion(''); setMensaje(''); }}>
          {registro.asistencia?.estado === 'presente' ? 'Corregir asistencia' : 'Registrar llegada manual'}
        </BotonAccion>}
      </article>)}
    </div>
  </section>;
}
