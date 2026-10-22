import { useEffect, useState } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { propuestaHorarioService as servicio } from '../../../../services/propuestaHorario.service';
import { api } from '../../../../services/api';
import { fechaHoyCampus } from '../../../../utils/fechas';
import { Icono } from '../../../ui/Icono';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ESTADOS = { borrador: 'En preparación', pendiente: 'Pendiente de Coordinación', aprobado: 'Aprobado', rechazado: 'Requiere correcciones' };
function formulario(s, horarios = []) {
  return { vigencia_inicio: String(s?.vigencia_inicio || fechaHoyCampus()).slice(0, 10), vigencia_fin: String(s?.vigencia_fin || '').slice(0, 10),
    detalle: (s?.detalle || horarios).map((h) => ({ id_espacio: h.id_espacio || '', dia_semana: h.dia_semana, hora_inicio: String(h.hora_inicio).slice(0,5), hora_fin: String(h.hora_fin).slice(0,5), descripcion: h.descripcion || '', ubicacion_maps: h.ubicacion_maps || '' })) };
}
export function PropuestaHorarioClub({ club }) {
  const { tema, inputCls, selectCls, cardCls } = useTheme();
  const [espacios, setEspacios] = useState([]);
  const [propuesta, setPropuesta] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState(() => formulario(null));
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    let activo = true;
    Promise.all([servicio.espacios(), servicio.listar(club.id_club), api.getHorarios(club.id_club)]).then(([lugares, solicitudes, horarios]) => {
      if (!activo) return;
      const actual = solicitudes.find((s) => ['borrador', 'pendiente'].includes(s.estado)) || (solicitudes[0]?.estado === 'rechazado' ? solicitudes[0] : null);
      setEspacios(lugares); setHistorial(solicitudes); setPropuesta(actual); setForm(formulario(actual, horarios));
    }).catch((err) => { if (activo) setError(err.message); }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [club.id_club]);
  const pendiente = propuesta?.estado === 'pendiente';
  function cambiarFila(indice, campo, valor) { setForm((prev) => ({ ...prev, detalle: prev.detalle.map((h, i) => i === indice ? { ...h, [campo]: valor } : h) })); }
  function incorporar(s) { setPropuesta(s); setHistorial((lista) => [s, ...lista.filter((otro) => otro.id_solicitud !== s.id_solicitud)]); }
  async function guardar() {
    if (ocupado || pendiente) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const datos = { ...form, vigencia_fin: form.vigencia_fin || null };
      const guardada = propuesta ? await servicio.editar(propuesta.id_solicitud, datos) : await servicio.crear(club.id_club, datos);
      incorporar(guardada);
      incorporar(await servicio.enviar(guardada.id_solicitud)); setMensaje('Horario enviado a admin para aprobación. Se repetirá cada semana, sin fecha de término salvo que indiques una.');
    } catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  async function retirar() {
    setOcupado(true); setError('');
    try { incorporar(await servicio.retirar(propuesta.id_solicitud)); setMensaje('Propuesta retirada de revisión. Ya puedes corregirla.'); }
    catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  return <section className={`mt-5 rounded-2xl border p-4 sm:p-6 ${cardCls}`} aria-labelledby="titulo-propuesta-horario">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 id="titulo-propuesta-horario" className={`text-base font-bold ${tema.title}`}>Proponer un horario</h3><p className={`mt-1 text-xs leading-relaxed ${tema.subtitle}`}>Elige los días y las horas habituales del club. Se repetirán cada semana hasta que cambies el horario; admin debe aprobarlo antes de que sea público.</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-600">{ESTADOS[propuesta?.estado] || 'Nueva propuesta'}</span></div>
    {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}{mensaje && <p role="status" className="mb-4 text-sm text-emerald-600">{mensaje}</p>}
    {cargando ? <p className={`text-sm ${tema.subtitle}`}>Cargando horario y lugares…</p> : <>
      {propuesta?.observaciones && <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-600">Observaciones de Coordinación: {propuesta.observaciones}</p>}
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <fieldset disabled={ocupado || pendiente} className="space-y-4">
          <details><summary className={`text-xs font-semibold cursor-pointer ${tema.title}`}>Periodo opcional: programar inicio o fecha de término</summary><p className={`my-2 text-xs ${tema.subtitle}`}>Por defecto empieza desde hoy y no vence. Estas fechas delimitan el periodo completo, no una sola semana.</p><div className="grid gap-3 sm:grid-cols-2"><label className={`text-xs font-semibold ${tema.title}`}>Válido desde<input aria-label="Válido desde" type="date" value={form.vigencia_inicio} onChange={(e) => setForm((p) => ({ ...p, vigencia_inicio: e.target.value }))} required className={`${inputCls} mt-1.5`} /></label><label className={`text-xs font-semibold ${tema.title}`}>Válido hasta (opcional)<input aria-label="Válido hasta (opcional)" type="date" value={form.vigencia_fin} min={form.vigencia_inicio} onChange={(e) => setForm((p) => ({ ...p, vigencia_fin: e.target.value }))} className={`${inputCls} mt-1.5`} /></label></div></details>
          <div className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-600">Horario recurrente · días y horas · sin límite de semanas</div>
          {!espacios.length && <p className={`text-xs ${tema.subtitle}`}>Admin debe registrar los lugares disponibles (por ejemplo, cancha o salón) antes de enviar un horario.</p>}
          <p className={`text-xs leading-relaxed ${tema.subtitle}`}>El lugar es la cancha, salón o área donde se hará la actividad. Se usa para evitar que dos clubes lo ocupen al mismo tiempo.</p>
          {form.detalle.map((h, i) => <div key={i} className={`rounded-xl border p-3 ${cardCls}`}>
            <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1.3fr_auto]"><label className={`text-[11px] ${tema.subtitle}`}>Día<select aria-label={`Día de sesión ${i + 1}`} value={h.dia_semana} onChange={(e) => cambiarFila(i, 'dia_semana', Number(e.target.value))} className={`${inputCls} mt-1 text-xs`}>{DIAS.map((d, n) => <option key={d} value={n}>{d}</option>)}</select></label><label className={`text-[11px] ${tema.subtitle}`}>Inicio<input aria-label={`Inicio de sesión ${i + 1}`} type="time" value={h.hora_inicio} onChange={(e) => cambiarFila(i, 'hora_inicio', e.target.value)} required className={`${inputCls} mt-1`} /></label><label className={`text-[11px] ${tema.subtitle}`}>Fin<input aria-label={`Fin de sesión ${i + 1}`} type="time" value={h.hora_fin} onChange={(e) => cambiarFila(i, 'hora_fin', e.target.value)} required className={`${inputCls} mt-1`} /></label><label className={`text-[11px] ${tema.subtitle}`}>Lugar de la actividad<select aria-label={`Lugar de sesión ${i + 1}`} value={h.id_espacio} onChange={(e) => cambiarFila(i, 'id_espacio', Number(e.target.value))} required className={`${inputCls} mt-1 text-xs`}><option value="">Selecciona un lugar…</option>{espacios.map((l) => <option key={l.id_espacio} value={l.id_espacio}>{l.nombre}</option>)}</select></label><button type="button" onClick={() => setForm((p) => ({ ...p, detalle: p.detalle.filter((_, n) => n !== i) }))} aria-label={`Quitar sesión ${i + 1}`} className="p-2 text-red-500 cursor-pointer"><Icono nombre="trash" className="h-4 w-4" /></button></div>
            <input aria-label={`Nota de sesión ${i + 1}`} value={h.descripcion} onChange={(e) => cambiarFila(i, 'descripcion', e.target.value)} maxLength={500} placeholder="Actividad o nota de la sesión (opcional)" className={`${inputCls} mt-2 text-xs`} />
          </div>)}
          <button type="button" disabled={!espacios.length} onClick={() => setForm((p) => ({ ...p, detalle: [...p.detalle, { dia_semana: 1, hora_inicio: '09:00', hora_fin: '10:00', id_espacio: '', descripcion: '' }] }))} className={`inline-flex items-center gap-2 px-3 py-2 ${selectCls}`}><Icono nombre="plus" className="h-4 w-4" />Agregar sesión</button>
          {!form.detalle.length && <p className="text-xs text-amber-600">Una propuesta sin sesiones solicita retirar el horario del club. Solo se aplicará si Coordinación la aprueba.</p>}
          <button type="submit" className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer disabled:opacity-40">{ocupado ? 'Enviando…' : 'Enviar horario a aprobación'}</button>
        </fieldset>
      </form>
      {pendiente && <button type="button" disabled={ocupado} onClick={retirar} className={`mt-4 rounded-lg border px-4 py-2 text-xs font-semibold cursor-pointer ${cardCls}`}>Retirar para corregir</button>}
      {historial.length > 0 && <details className="mt-5"><summary className={`text-xs font-semibold cursor-pointer ${tema.title}`}>Versiones y decisiones anteriores</summary><div className="mt-3 space-y-2">{historial.map((s) => <p key={s.id_solicitud} className={`text-xs ${tema.subtitle}`}>Propuesta #{s.id_solicitud} · {ESTADOS[s.estado]}{s.observaciones ? ` · ${s.observaciones}` : ''}</p>)}</div></details>}
    </>}
  </section>;
}
