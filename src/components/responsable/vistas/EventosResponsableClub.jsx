import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { Alerta } from '../../ui/Alerta';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';

const FORM_VACIO = { titulo: '', descripcion: '', fecha_evento: '', fecha_fin_evento: '', hora_evento: '', lugar_evento: '' };

function fechaActualCampus() {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const valor = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

function fechaBonita(fecha) {
  if (!fecha) return '';
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function EventosResponsableClub({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [eventos, setEventos] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [eventoAEliminar, setEventoAEliminar] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const tarjeta = modoOscuro ? 'bg-[#0e162c] border-slate-700/60' : 'bg-white border-slate-200 shadow-sm';
  const campo = `w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-400/40 ${modoOscuro ? 'border-slate-700 bg-slate-900/60 text-slate-100 placeholder:text-slate-500' : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400'}`;
  const hoy = fechaActualCampus();
  const ultimoDiaDelAnio = `${hoy.slice(0, 4)}-12-31`;

  const cargarEventos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await api.getEventosClubGestion(club.id_club);
      setEventos(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los eventos.');
    } finally {
      setCargando(false);
    }
  }, [club.id_club]);

  useEffect(() => { cargarEventos(); }, [cargarEventos]);

  function abrirNuevo() {
    setEventoEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setExito('');
    setMostrarFormulario(true);
  }

  function abrirEdicion(evento) {
    setEventoEditando(evento.id_evento_club);
    setForm({ titulo: evento.titulo, descripcion: evento.descripcion, fecha_evento: evento.fecha_evento, fecha_fin_evento: evento.fecha_fin_evento || '',
      hora_evento: evento.hora_evento ? String(evento.hora_evento).slice(0, 5) : '', lugar_evento: evento.lugar_evento || '' });
    setError('');
    setExito('');
    setMostrarFormulario(true);
  }

  async function guardar(e) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError('');
    setExito('');
    if (form.fecha_evento < hoy) {
      setError('La fecha de inicio no puede ser anterior a hoy.');
      setGuardando(false);
      return;
    }
    if (form.fecha_evento > ultimoDiaDelAnio || (form.fecha_fin_evento && form.fecha_fin_evento > ultimoDiaDelAnio)) {
      setError('Solo puedes programar eventos dentro del año actual.');
      setGuardando(false);
      return;
    }
    if (form.fecha_fin_evento && form.fecha_fin_evento < form.fecha_evento) {
      setError('La fecha de término no puede ser anterior a la fecha de inicio.');
      setGuardando(false);
      return;
    }
    const datos = { titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), fecha_evento: form.fecha_evento,
      fecha_fin_evento: form.fecha_fin_evento || null,
      hora_evento: form.hora_evento || null, lugar_evento: form.lugar_evento.trim() || null };
    try {
      if (eventoEditando) await api.updateEventoClub(club.id_club, eventoEditando, datos);
      else await api.createEventoClub(club.id_club, datos);
      setMostrarFormulario(false);
      setForm(FORM_VACIO);
      setEventoEditando(null);
      setExito(eventoEditando ? 'Evento actualizado.' : 'Evento publicado.');
      await cargarEventos();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el evento.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!eventoAEliminar || guardando) return;
    setGuardando(true);
    setError('');
    try {
      await api.deleteEventoClub(club.id_club, eventoAEliminar.id_evento_club);
      setEventoAEliminar(null);
      setExito('Evento eliminado.');
      await cargarEventos();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el evento.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>Eventos del club</h2>
          <p className={`mt-1 text-sm ${tema.subtitle}`}>Publica y administra las actividades que aparecerán en el detalle de {club.nombre_club}.</p>
        </div>
        {!mostrarFormulario && <button type="button" onClick={abrirNuevo} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#0e162c] hover:bg-amber-300">
          <Icono nombre="plus" className="h-4 w-4" /> Nuevo evento
        </button>}
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}
      {exito && <Alerta tipo="success" mensaje={exito} />}

      {mostrarFormulario && <form onSubmit={guardar} className={`${tarjeta} space-y-4 rounded-2xl border p-4 md:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className={`font-black ${tema.title}`}>{eventoEditando ? 'Editar evento' : 'Nuevo evento'}</h3>
          <button type="button" onClick={() => { setMostrarFormulario(false); setError(''); }} className={`rounded-lg p-2 ${modoOscuro ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Cerrar formulario"><Icono nombre="close" className="h-4 w-4" /></button>
        </div>
        <label className={`block space-y-1.5 text-xs font-bold ${tema.title}`}>Título <input className={campo} maxLength={150} required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ej. Torneo Escolar" /><span className={`block text-right text-[10px] font-normal ${tema.subtitle}`}>{form.titulo.length}/150</span></label>
        <label className={`block space-y-1.5 text-xs font-bold ${tema.title}`}>Descripción <textarea className={`${campo} min-h-24 resize-y`} maxLength={2000} required value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Detalles del evento" /><span className={`block text-right text-[10px] font-normal ${tema.subtitle}`}>{form.descripcion.length}/2000</span></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={`block space-y-1.5 text-xs font-bold ${tema.title}`}>Fecha de inicio <input type="date" className={`${campo} cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer`} min={hoy} max={ultimoDiaDelAnio} required value={form.fecha_evento} onChange={(e) => setForm((f) => ({ ...f, fecha_evento: e.target.value, fecha_fin_evento: f.fecha_fin_evento && f.fecha_fin_evento < e.target.value ? '' : f.fecha_fin_evento }))} /></label>
          <label className={`block space-y-1.5 text-xs font-bold ${tema.title}`}>Hora (opcional) <input type="time" className={`${campo} cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer`} value={form.hora_evento} onChange={(e) => setForm((f) => ({ ...f, hora_evento: e.target.value }))} /></label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={`block space-y-1.5 text-xs font-bold ${tema.title}`}>Fecha de término (opcional) <input type="date" className={`${campo} cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer`} min={form.fecha_evento || hoy} max={ultimoDiaDelAnio} value={form.fecha_fin_evento} onChange={(e) => setForm((f) => ({ ...f, fecha_fin_evento: e.target.value }))} /></label>
          <label className={`block space-y-1.5 text-xs font-bold ${tema.title}`}>Lugar (opcional) <input className={campo} maxLength={200} value={form.lugar_evento} onChange={(e) => setForm((f) => ({ ...f, lugar_evento: e.target.value }))} placeholder="Ej. Cancha UNID" /><span className={`block text-right text-[10px] font-normal ${tema.subtitle}`}>{form.lugar_evento.length}/200</span></label>
        </div>
        <p className={`text-[11px] ${tema.subtitle}`}>Solo se permiten eventos con fechas dentro del año actual. Aparecerán en la ficha pública mientras estén vigentes.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setMostrarFormulario(false)} className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${modoOscuro ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}>Cancelar</button>
          <button type="submit" disabled={guardando} className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#0e162c] disabled:opacity-50">{guardando ? 'Guardando…' : eventoEditando ? 'Guardar cambios' : 'Publicar evento'}</button>
        </div>
      </form>}

      {cargando ? <div className={`py-10 text-center text-sm ${tema.subtitle}`}>Cargando eventos…</div> : eventos.length === 0 ? (
        <div className={`${tarjeta} rounded-2xl border px-5 py-10 text-center`}>
          <Icono nombre="calendar" className={`mx-auto mb-3 h-7 w-7 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`} />
          <p className={`font-bold ${tema.title}`}>Aún no hay eventos</p>
          <p className={`mt-1 text-sm ${tema.subtitle}`}>Cuando publiques uno, aparecerá en el detalle público del club.</p>
        </div>
      ) : <div className="grid gap-3 lg:grid-cols-2">
        {eventos.map((evento) => (
          <article key={evento.id_evento_club} className={`${tarjeta} rounded-2xl border p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={`font-black ${tema.title}`}>{evento.titulo}</h3>
                <p className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${tema.subtitle}`}>
                  <span className="inline-flex items-center gap-1"><Icono nombre="calendar" className="h-3.5 w-3.5 text-amber-500" />{fechaBonita(evento.fecha_evento)}{evento.fecha_fin_evento && evento.fecha_fin_evento !== evento.fecha_evento ? ` – ${fechaBonita(evento.fecha_fin_evento)}` : ''}</span>
                  {evento.hora_evento && <span className="inline-flex items-center gap-1"><Icono nombre="clock" className="h-3.5 w-3.5 text-amber-500" />{String(evento.hora_evento).slice(0, 5)}</span>}
                  {evento.lugar_evento && <span className="inline-flex items-center gap-1"><Icono nombre="map-pin" className="h-3.5 w-3.5 text-amber-500" />{evento.lugar_evento}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => abrirEdicion(evento)} className={`rounded-lg p-2 ${modoOscuro ? 'text-amber-400 hover:bg-slate-800' : 'text-amber-700 hover:bg-amber-50'}`} aria-label={`Editar ${evento.titulo}`}><Icono nombre="edit" className="h-4 w-4" /></button>
                <button type="button" onClick={() => setEventoAEliminar(evento)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10" aria-label={`Eliminar ${evento.titulo}`}><Icono nombre="trash" className="h-4 w-4" /></button>
              </div>
            </div>
            <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>{evento.descripcion}</p>
          </article>
        ))}
      </div>}

      <ModalConfirmacion show={!!eventoAEliminar} titulo="Eliminar evento"
        mensaje={`¿Quieres eliminar “${eventoAEliminar?.titulo || ''}”? Esta acción no se puede deshacer.`}
        textoConfirmar="Eliminar" varianteDanger cargando={guardando} onConfirmar={eliminar}
        onCancelar={() => { if (!guardando) setEventoAEliminar(null); }} />
    </section>
  );
}
