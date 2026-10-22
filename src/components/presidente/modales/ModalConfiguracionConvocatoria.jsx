import { useEffect, useState } from 'react';
import { useAutenticacion } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../services/api';
import { convocatoriaService } from '../../../services/convocatoria.service';
import { MAX_POSTULACIONES } from '../../../constants/limites';
import { toDatetimeLocal, fromDatetimeLocal } from '../../../utils/fechas';
import { Spinner } from '../../ui/Spinner';
import { BadgeEstado } from '../convocatoria/BadgeEstado';
import { ConvocatoriaConfirmCerrarBox } from '../convocatoria/ConvocatoriaAcciones';

const ESTADOS = { pendiente: 'Pendiente de revisión', aprobado: 'Aprobada y publicada', rechazado: 'Requiere correcciones' };
export function ModalConfiguracionConvocatoria({ club }) {
  const { esAdmin, usuario } = useAutenticacion();
  const { tema, cardCls, inputCls } = useTheme();
  const presidente = usuario?.id_rol === 2;
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  function incorporar(data) {
    setConfig(data);
    setForm(['pendiente', 'rechazado'].includes(data.solicitud?.estado) ? data.solicitud.configuracion : data);
  }
  useEffect(() => {
    let activo = true;
    api.getConvocatoriaClub(club.id_club).then((data) => { if (activo) incorporar(data); })
      .catch((err) => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, [club.id_club]);
  async function ejecutar(operacion, texto) {
    setOcupado(true); setError(''); setMensaje('');
    try { incorporar(await operacion()); setObservaciones(''); setMensaje(texto); }
    catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  function enviar(e) {
    e.preventDefault();
    ejecutar(() => api.actualizarConfiguracionConvocatoria(club.id_club, {
      fecha_apertura_programada: form.fecha_apertura_programada || null,
      fecha_limite_cierre: form.fecha_limite_cierre || null,
      max_postulaciones: form.max_postulaciones ?? MAX_POSTULACIONES,
    }), 'Convocatoria enviada a revisión. No se publicará hasta que admin la apruebe.');
  }
  function revisar(accion) {
    ejecutar(() => convocatoriaService.revisarInscripcion(club.id_club, config.solicitud.id_solicitud, accion, observaciones),
      accion === 'aprobar' ? 'Convocatoria aprobada. Las inscripciones ya usan la configuración autorizada.' : 'Se enviaron las observaciones al presidente.');
  }
  if (!config) return error ? <p role="alert" className="text-sm text-red-500">{error}</p> : <Spinner />;
  const s = config.solicitud;
  const pendiente = s?.estado === 'pendiente';
  const fecha = (valor) => valor ? new Date(valor).toLocaleString('es-MX') : 'Sin fecha definida';
  return <section className="space-y-4">
    <header><h3 className={tema.title + ' text-lg font-bold'}>Convocatoria de inscripción</h3><p className={tema.subtitle + ' mt-1 text-sm'}>El presidente prepara la convocatoria; admin la revisa y aprueba antes de publicarla.</p></header>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {mensaje && <p role="status" className="text-sm text-emerald-600">{mensaje}</p>}
    <div className={cardCls + ' rounded-xl border p-4'}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className={tema.title + ' text-sm font-semibold'}>Versión publicada</h4><BadgeEstado estado={config.estado_calculado} /></div>
      <div className={tema.subtitle + ' mt-3 space-y-1 text-xs'}><p>Apertura: {fecha(config.fecha_apertura_programada)}</p><p>Cierre: {fecha(config.fecha_limite_cierre)}</p><p>Postulaciones: {config.postulaciones_actuales || 0} / {config.max_postulaciones || MAX_POSTULACIONES}</p></div>
    </div>
    <form onSubmit={enviar} className={cardCls + ' rounded-xl border p-4 sm:p-5'}>
      <h4 className={tema.title + ' mb-2 text-sm font-bold'}>{pendiente ? 'Convocatoria por revisar' : esAdmin ? 'Última configuración del club' : 'Preparar convocatoria'}</h4>
      {s && <p className={tema.subtitle + ' mb-3 text-xs'}>{ESTADOS[s.estado]}{s.observaciones ? ' · ' + s.observaciones : ''}</p>}
      <fieldset disabled={ocupado || !presidente || pendiente} className="grid gap-4 sm:grid-cols-2">
        <label className={tema.title + ' text-xs font-semibold'}>Apertura<input type="datetime-local" value={toDatetimeLocal(form.fecha_apertura_programada)} onChange={(e) => setForm((p) => ({ ...p, fecha_apertura_programada: fromDatetimeLocal(e.target.value) }))} className={inputCls + ' mt-2'} /></label>
        <label className={tema.title + ' text-xs font-semibold'}>Cierre (opcional)<input type="datetime-local" min={toDatetimeLocal(form.fecha_apertura_programada)} value={toDatetimeLocal(form.fecha_limite_cierre)} onChange={(e) => setForm((p) => ({ ...p, fecha_limite_cierre: fromDatetimeLocal(e.target.value) }))} className={inputCls + ' mt-2'} /></label>
        <label className={tema.title + ' text-xs font-semibold'}>Límite de postulaciones<input type="number" min="1" max={MAX_POSTULACIONES} value={form.max_postulaciones ?? ''} placeholder={String(MAX_POSTULACIONES)} onChange={(e) => setForm((p) => ({ ...p, max_postulaciones: e.target.value ? Number(e.target.value) : null }))} className={inputCls + ' mt-2'} /></label>
      </fieldset>
      {presidente && !pendiente && <button disabled={ocupado} className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer disabled:opacity-40">{ocupado ? 'Enviando…' : 'Enviar a revisión de admin'}</button>}
      {pendiente && !esAdmin && <p className={tema.subtitle + ' mt-4 text-xs'}>Admin está revisando esta propuesta. La versión publicada no cambia mientras tanto.</p>}
    </form>
    {esAdmin && pendiente && <div className={cardCls + ' rounded-xl border p-4'}>
      <label className={tema.title + ' text-xs font-semibold'}>Observaciones para el presidente<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={2000} className={inputCls + ' mt-2'} placeholder="Obligatorias para devolver con correcciones" /></label>
      <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={ocupado} onClick={() => revisar('aprobar')} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-40">Aprobar y publicar</button><button type="button" disabled={ocupado || !observaciones.trim()} onClick={() => revisar('rechazar')} className="rounded-lg border border-red-400 px-4 py-2 text-xs text-red-500 cursor-pointer disabled:opacity-40">Devolver con observaciones</button></div>
    </div>}
    {esAdmin && config.estado_calculado === 'abierto' && !confirmarCierre && <button type="button" disabled={ocupado} onClick={() => setConfirmarCierre(true)} className="text-xs font-semibold text-red-500 cursor-pointer">Cerrar inscripciones publicadas</button>}
    {confirmarCierre && <ConvocatoriaConfirmCerrarBox guardando={ocupado} tema={tema} onCancelar={() => setConfirmarCierre(false)} onConfirmar={() => { setConfirmarCierre(false); ejecutar(async () => { await api.cerrarConvocatoria(club.id_club); return api.getConvocatoriaClub(club.id_club); }, 'Inscripciones cerradas.'); }} />}
  </section>;
}
