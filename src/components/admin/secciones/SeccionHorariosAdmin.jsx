import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { propuestaHorarioService as servicio } from '../../../services/propuestaHorario.service';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export function SeccionHorariosAdmin() {
  const { tema, cardCls, inputCls, selectCls } = useTheme();
  const [solicitudes, setSolicitudes] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [filtro, setFiltro] = useState('pendiente');
  const [seleccionada, setSeleccionada] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try { const [lista, lugares] = await Promise.all([servicio.listar(), servicio.espacios()]); setSolicitudes(lista); setEspacios(lugares); }
    catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);
  async function revisar(accion) {
    if (ocupado) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const s = await servicio.revisar(seleccionada.id_solicitud, accion, observaciones);
      setSolicitudes((lista) => lista.map((x) => x.id_solicitud === s.id_solicitud ? { ...x, ...s } : x));
      setSeleccionada(null); setObservaciones(''); setMensaje(accion === 'aprobar' ? 'Horario aprobado. La versión oficial se actualizó con la vigencia indicada.' : 'Propuesta rechazada. Se notificó al presidente con tus observaciones.');
    } catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  async function agregarEspacio(e) {
    e.preventDefault(); setOcupado(true); setError('');
    try { const lugar = await servicio.crearEspacio(nombre); setEspacios((lista) => [...lista, lugar]); setNombre(''); setMensaje('Lugar agregado al catálogo.'); }
    catch (err) { setError(err.message); }
    finally { setOcupado(false); }
  }
  return <section aria-labelledby="titulo-revision-horarios" className="max-w-6xl space-y-5">
    <header><h2 id="titulo-revision-horarios" className={`text-xl font-bold ${tema.title}`}>Aprobación de horarios</h2><p className={`mt-1 text-sm ${tema.subtitle}`}>Coordinación VIVE · revisa los días y horas recurrentes propuestos por los presidentes. El sistema evita que dos clubes ocupen el mismo lugar al mismo tiempo.</p></header>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}{mensaje && <p role="status" className="text-sm text-emerald-600">{mensaje}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4"><div className="flex justify-between gap-3"><select aria-label="Estado de propuestas" value={filtro} onChange={(e) => setFiltro(e.target.value)} className={selectCls}><option value="pendiente">Pendientes de revisión</option><option value="todos">Todos los estados</option><option value="aprobado">Aprobados</option><option value="rechazado">Rechazados</option></select><button type="button" onClick={cargar} disabled={ocupado} className={`text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>Actualizar</button></div>
        {cargando ? <p className={`text-sm ${tema.subtitle}`}>Cargando propuestas…</p> : solicitudes.filter((s) => s.estado !== 'borrador' && (filtro === 'todos' || s.estado === filtro)).map((s) => <button type="button" key={s.id_solicitud} onClick={() => { setSeleccionada(s); setObservaciones(''); }} className={`block w-full rounded-xl border p-4 text-left cursor-pointer ${cardCls}`}><span className={`block text-sm font-bold ${tema.title}`}>{s.nombre_club}</span><span className={`mt-1 block text-xs ${tema.subtitle}`}>Propuesta #{s.id_solicitud} · {s.estado} · {s.detalle.length} sesiones</span><span className={`mt-1 block text-xs ${tema.subtitle}`}>{s.solicitante_nombre} · Desde {String(s.vigencia_inicio).slice(0,10)}{s.vigencia_fin ? ` hasta ${String(s.vigencia_fin).slice(0,10)}` : ' · Sin fecha de término'}</span></button>)}
        {!cargando && !solicitudes.some((s) => s.estado !== 'borrador' && (filtro === 'todos' || s.estado === filtro)) && <p className={`rounded-xl border p-6 text-sm ${cardCls} ${tema.subtitle}`}>No hay propuestas con ese estado.</p>}
        {seleccionada && <div className={`rounded-2xl border p-5 ${cardCls}`}><h3 className={`text-base font-bold ${tema.title}`}>{seleccionada.nombre_club} · revisión completa</h3><p className={`mt-2 text-xs ${tema.subtitle}`}>Estos días y horas se repetirán cada semana durante el periodo indicado. Si no hay fecha final, el horario continúa hasta que se apruebe un cambio.</p><div className="my-4 space-y-2">{seleccionada.detalle.map((h,i) => <div key={i} className={`border-b pb-2 text-xs ${tema.subtitle}`}><span className={`font-semibold ${tema.title}`}>{DIAS[h.dia_semana]} · {h.hora_inicio}–{h.hora_fin}</span><span className="mt-1 block">{espacios.find((l) => l.id_espacio === h.id_espacio)?.nombre || 'Espacio no disponible'}</span>{h.descripcion && <p className="mt-1">{h.descripcion}</p>}</div>)}{!seleccionada.detalle.length && <p className="text-xs text-amber-600">La propuesta solicita retirar todas las sesiones oficiales del club.</p>}</div>
          {seleccionada.estado === 'pendiente' ? <><label className={`block text-xs font-semibold ${tema.title}`}>Observaciones<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={2000} rows={3} className={`${inputCls} mt-2`} placeholder="Obligatorias si rechazas la propuesta" /></label><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={ocupado} onClick={() => revisar('aprobar')} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-40">Aprobar horario</button><button type="button" disabled={ocupado || !observaciones.trim()} onClick={() => revisar('rechazar')} className="rounded-lg border border-red-400/40 px-4 py-2 text-xs font-semibold text-red-500 cursor-pointer disabled:opacity-40">Rechazar con observaciones</button></div></> : <p className={`text-xs ${tema.subtitle}`}>{seleccionada.observaciones || 'Esta propuesta no está pendiente de revisión.'}</p>}
        </div>}
      </div>
      <aside className={`rounded-2xl border p-4 ${cardCls}`}><h3 className={`text-sm font-bold ${tema.title}`}>Lugares de actividad</h3><p className={`mt-1 text-xs leading-relaxed ${tema.subtitle}`}>Un nombre único por cancha, salón o área. El sistema comprueba los cruces entre todos los clubes al enviar y aprobar.</p><ul className="my-4 space-y-2">{espacios.map((l) => <li key={l.id_espacio} className={`text-xs ${tema.subtitle}`}>{l.nombre}</li>)}</ul><form onSubmit={agregarEspacio}><label className={`text-xs font-semibold ${tema.title}`}>Nuevo lugar<input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} required className={`${inputCls} mt-2`} placeholder="Ej. Cancha principal" /></label><button disabled={ocupado} className="mt-3 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer">Agregar lugar</button></form></aside>
    </div>
  </section>;
}
