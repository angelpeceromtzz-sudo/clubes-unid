/* Calendario semanal de horarios de entrenamiento del club. */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icono } from '../../ui/Icono';
import { Spinner } from '../../ui/Spinner';
import { BotonAccion } from '../../ui/BotonAccion';
import { SelectorMapa } from '../../ui/SelectorMapa';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { api } from '../../../services/api';
import { CalendarioGrid } from './CalendarioGrid';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTO = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const HORA_MIN_DEFAULT = 8;
const HORA_MAX_DEFAULT = 18;
const ROW_HEIGHT = 40;
const COL_HORA_W = 36;

function horaStr(h) { return h?.slice(0, 5) || '00:00'; }

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function HorariosClub({ club, modoOscuro, esAdmin, esPresidente, esMiembro }) {
  const puedeVer = esAdmin || esPresidente;
  const puedeVerNotas = esMiembro || puedeVer;

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [horarioAEliminar, setHorarioAEliminar] = useState(null);

  const [form, setForm] = useState({
    dias_semana: [],
    hora_inicio: '09:00',
    hora_fin: '11:00',
    lugar: '',
    ubicacion_maps: '',
    descripcion: '',
  });
  const [showLista, setShowLista] = useState(false);

  useEffect(() => {
    if (club?.id_club) cargarHorarios();
  }, [club?.id_club]);

  async function cargarHorarios() {
    try {
      const data = await api.getHorarios(club.id_club);
      setHorarios(data);
    } catch { setHorarios([]); }
    finally { setCargando(false); }
  }

  const { horaMin, horaMax } = useMemo(() => {
    if (!horarios.length) return { horaMin: HORA_MIN_DEFAULT, horaMax: HORA_MAX_DEFAULT };
    let min = 24 * 60, max = 0;
    horarios.forEach(h => {
      const ini = timeToMinutes(horaStr(h.hora_inicio));
      const fin = timeToMinutes(horaStr(h.hora_fin));
      if (ini < min) min = ini;
      if (fin > max) max = fin;
    });
    const padding = 30;
    const hMin = Math.floor(Math.max((min - padding) / 60, 6));
    const hMax = Math.ceil(Math.min((max + padding) / 60, 23));
    return { horaMin: hMin, horaMax: hMax };
  }, [horarios]);

  function showToast(msg, tipo = 'error') {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ dias_semana: [], hora_inicio: '09:00', hora_fin: '11:00', lugar: '', ubicacion_maps: '', descripcion: '' });
    setError('');
    setShowForm(true);
  }

  function abrirEditar(h) {
    setEditando(h);
    setForm({
      dias_semana: [h.dia_semana],
      hora_inicio: horaStr(h.hora_inicio),
      hora_fin: horaStr(h.hora_fin),
      lugar: h.lugar || '',
      ubicacion_maps: h.ubicacion_maps || '',
      descripcion: h.descripcion || '',
    });
    setError('');
    setShowForm(true);
  }

  function abrirCrearDesdeGrid({ dia_semana, hora_inicio, hora_fin }) {
    setEditando(null);
    setForm({ dias_semana: [dia_semana], hora_inicio, hora_fin, lugar: '', ubicacion_maps: '', descripcion: '' });
    setError('');
    setShowForm(true);
  }

  function toggleDia(dia) {
    setForm(prev => {
      const dias = prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia];
      return { ...prev, dias_semana: dias };
    });
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.dias_semana.length || !form.hora_inicio || !form.hora_fin || !form.lugar) return;
    setEnviando(true);
    setError('');
    try {
      if (editando) {
        await api.updateHorario(editando.id_horario, {
          dia_semana: form.dias_semana[0],
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
          lugar: form.lugar,
          ubicacion_maps: form.ubicacion_maps,
          descripcion: form.descripcion,
        });
      } else {
        await api.createHorario(club.id_club, form);
      }
      setShowForm(false);
      setDrawMode(false);
      await cargarHorarios();
    } catch (err) {
      const msg = err?.message || err?.error || 'Error al guardar';
      setError(msg);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id) {
    setHorarioAEliminar(id);
  }

  async function confirmarEliminarHorario() {
    const id = horarioAEliminar;
    setHorarioAEliminar(null);
    try {
      await api.deleteHorario(id);
      await cargarHorarios();
    } catch { /* silently handled */ }
  }

  /* ─── Drag & Drop handlers ─── */
  const handleMove = useCallback(async (id, data) => {
    if (data.conflicto) {
      showToast('Conflicto de horario: ya existe un entrenamiento en esa franja');
      return;
    }
    try {
      await api.updateHorario(id, {
        dia_semana: data.dia_semana,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
      });
      await cargarHorarios();
    } catch (err) {
      showToast(err?.error || 'Error al mover el horario');
      await cargarHorarios();
    }
  }, []);

  const handleResize = useCallback(async (id, data) => {
    try {
      await api.updateHorario(id, {
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
      });
      await cargarHorarios();
    } catch (err) {
      showToast(err?.error || 'Error al redimensionar');
      await cargarHorarios();
    }
  }, []);

  const handleCreate = useCallback((data) => {
    abrirCrearDesdeGrid(data);
  }, []);

  /* ─── Vista móvil (tap-to-select) ─── */
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);

  return (
    <>
    <section className={`rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200'}`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl border shadow-2xl text-sm font-medium transition-all
          ${toast.tipo === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
          }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
        <div className="flex items-center gap-2.5">
          <Icono nombre="clock" strokeWidth={2} className={`h-4 w-4 shrink-0 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
          <h2 className={`text-sm font-black tracking-tight ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Horario</h2>
          {!cargando && horarios.length > 0 && (
            <span className={`text-[9px] font-bold tabular-nums ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
              {horarios.length} {horarios.length === 1 ? 'sesión' : 'sesiones'}
            </span>
          )}
        </div>
        {puedeVer && !showForm && (
          <div className="flex items-center gap-1.5">
            {drawMode && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mr-1">
                Dibujando...
              </span>
            )}
            {puedeVer && horarios.length > 0 && (
              <button onClick={() => setShowPreview(true)}
                title="Vista previa del alumno"
                className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer">
                <Icono nombre="eye" className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            <button onClick={() => setDrawMode(prev => !prev)}
              title={drawMode ? 'Desactivar modo dibujar' : 'Activar modo dibujar'}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                drawMode
                  ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-amber-400/10 border-amber-400/20 text-amber-400 hover:bg-amber-400/20'
              }`}>
              <Icono nombre="pencil" className="h-4 w-4" strokeWidth={2} />
            </button>
            <button onClick={() => setShowLista(true)}
              title="Editar horarios existentes"
              className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer">
              <Icono nombre="edit" className="h-4 w-4" strokeWidth={2} />
            </button>
            <button onClick={abrirNuevo}
              title="Crear nuevo horario"
              className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer">
              <Icono nombre="plus" className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Formulario modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden
            ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b flex items-center justify-between
              ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                {editando ? 'Editar horario' : 'Nuevo horario'}
              </h3>
              <button onClick={() => setShowForm(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer
                  ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={guardar} className="p-5 space-y-4">
              {error && (
                <div className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                  Días de la semana
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {DIAS.map((dia, i) => (
                    <button key={i} type="button" onClick={() => toggleDia(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border
                        ${form.dias_semana.includes(i)
                          ? 'bg-amber-400 text-[#0e162c] border-amber-400'
                          : modoOscuro
                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-400/50 hover:text-amber-400'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                        }`}>
                      {DIAS_CORTO[i]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Hora inicio</label>
                  <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} required
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                      ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Hora fin</label>
                  <input type="time" value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })} required
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                      ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Lugar</label>
                <input type="text" value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} required
                  placeholder="Ej: Cancha 1, Gimnasio..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                    ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider block ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ubicación Maps <span className="font-normal">(opcional)</span>
                </label>
                <SelectorMapa
                  valorLugar={form.lugar}
                  valorUbicacion={form.ubicacion_maps}
                  modoOscuro={modoOscuro}
                  onCambio={({ lugar, ubicacion_maps }) => setForm(prev => ({
                    ...prev,
                    lugar: prev.lugar || lugar,
                    ubicacion_maps,
                  }))}
                />
                <input type="url" value={form.ubicacion_maps} onChange={e => setForm({ ...form, ubicacion_maps: e.target.value })}
                  placeholder="O pega un link manual: https://maps.google.com/?q=..."
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50
                    ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
              </div>

              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                  Notas <span className="font-normal">(opcional)</span>
                </label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={2} maxLength={100} placeholder="Instrucciones, material, etc."
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50 resize-none
                    ${modoOscuro ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`} />
                <p className={`text-[10px] mt-1 text-right ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                  {form.descripcion.length}/100
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <BotonAccion type="submit" disabled={enviando} variant="primary" size="sm">
                  {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Agregar'}
                </BotonAccion>
                <BotonAccion onClick={() => setShowForm(false)} variant="outline" size="sm">Cancelar</BotonAccion>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de horarios para editar */}
      {showLista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowLista(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className={`relative w-full max-w-md max-h-[70vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col
            ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0
              ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                Editar horarios
              </h3>
              <button onClick={() => setShowLista(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer
                  ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {horarios.length === 0 && (
                <p className={`text-xs text-center py-4 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                  Sin horarios registrados
                </p>
              )}
              {[1, 2, 3, 4, 5, 6, 0].map(dia => {
                const bloques = horarios.filter(h => h.dia_semana === dia);
                if (!bloques.length) return null;
                return (
                  <div key={dia}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1
                      ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`}>
                      {DIAS[dia]}
                    </p>
                    {bloques.map(b => (
                      <div key={b.id_horario}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 border
                          ${modoOscuro ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                        <Icono nombre="clock" className={`h-3.5 w-3.5 shrink-0 ${modoOscuro ? 'text-amber-400' : 'text-amber-500'}`} strokeWidth={2} />
                        <span className={`text-xs font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                          {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                        </span>
                        <span className={`text-[11px] ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                          {b.lugar}
                        </span>
                        <div className="flex-1" />
                        <button onClick={() => { setShowLista(false); abrirEditar(b); }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer
                            ${modoOscuro ? 'bg-slate-700 text-slate-300 hover:text-white' : 'bg-slate-200 text-slate-600 hover:text-slate-900'}`}>
                          Editar
                        </button>
                        <button onClick={() => { setShowLista(false); eliminar(b.id_horario); }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer bg-red-500/10 text-red-400 hover:bg-red-500/20">
                          Borrar
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Calendario */}
      {cargando ? (
        <Spinner className="py-12" />
      ) : horarios.length === 0 ? (
        <div className={`rounded-xl border border-dashed m-4 p-6 text-center
          ${modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-300 bg-slate-50'}`}>
          <Icono nombre="clock" strokeWidth={1.5} className={`h-8 w-8 mx-auto mb-2 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-xs font-medium ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
            {puedeVer ? 'Sin horarios — crea el primero' : 'Sin horarios registrados'}
          </p>
        </div>
      ) : (
        <>
          {/* Vista escritorio — CalendarioGrid (solo admin/presidente) */}
          {puedeVer && (
            <CalendarioGrid
              horarios={horarios}
              rowHeight={ROW_HEIGHT}
              colHoraWidth={COL_HORA_W}
              horaMin={horaMin}
              horaMax={horaMax}
              puedeVer={puedeVer}
              modoOscuro={modoOscuro}
              drawMode={drawMode}
              onEditar={abrirEditar}
              onEliminar={eliminar}
              onMove={handleMove}
              onResize={handleResize}
              onCreate={handleCreate}
            />
          )}

          {/* Vista apilada por día — siempre en mobile, y en desktop para alumno/pública */}
          <div className={`${puedeVer ? 'md:hidden' : ''} space-y-3 p-4`}>
            {(() => {
              const diasConHorarios = [1, 2, 3, 4, 5, 6, 0].filter(dia => horarios.some(h => h.dia_semana === dia));
              const diasVisibles = puedeVer || mostrarTodos ? diasConHorarios : diasConHorarios.slice(0, 1);
              const hayMas = !puedeVer && diasConHorarios.length > 1 && !mostrarTodos;

              return (
                <>
                  {diasVisibles.map(dia => {
                    const bloques = horarios.filter(h => h.dia_semana === dia);
                    return (
                      <div key={dia}
                        className={`rounded-xl border overflow-hidden
                          ${modoOscuro ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`px-4 py-2.5 border-b font-bold text-xs md:text-sm uppercase tracking-wider
                          ${modoOscuro ? 'border-slate-700/50 text-amber-400' : 'border-slate-200 text-amber-600'}`}>
                          {DIAS[dia]}
                        </div>
                  {bloques.map(b => {
                    const seleccionado = bloqueSeleccionado === b.id_horario;
                    return (
                      <div key={b.id_horario}
                        onClick={() => puedeVer ? setBloqueSeleccionado(seleccionado ? null : b.id_horario) : null}
                        className={`px-4 py-3 border-b last:border-b-0 transition-colors
                          ${puedeVer ? 'cursor-pointer' : ''}
                          ${seleccionado ? modoOscuro ? 'bg-amber-400/10' : 'bg-amber-50' : ''}
                          ${modoOscuro ? 'border-slate-700/30' : 'border-slate-200/60'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Icono nombre="clock" className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} />
                              <span className={`text-sm md:text-base font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                                {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Icono nombre="location" className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/60" strokeWidth={2} />
                              <span className={`text-xs md:text-sm break-words ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{b.lugar}</span>
                            </div>
                          </div>
                          {(b.descripcion || b.ubicacion_maps) && (
                            <div className="min-w-0 sm:text-right sm:shrink-0">
                              {puedeVerNotas && b.descripcion && (
                                <p className={`text-xs md:text-sm leading-snug line-clamp-3 sm:line-clamp-2 break-words ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                                  {b.descripcion}
                                </p>
                              )}
                              {b.ubicacion_maps && (
                                <a href={b.ubicacion_maps} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className={`inline-flex items-center gap-1 text-xs md:text-sm font-bold mt-0.5 transition-colors
                                    ${modoOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}>
                                  <Icono nombre="location" className="h-3 w-3" strokeWidth={2} />
                                  Ver ubicación
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        {puedeVer && seleccionado && (
                          <div className={`flex gap-2 mt-2 pt-2 border-t
                            ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            <button onClick={(e) => { e.stopPropagation(); abrirEditar(b); }}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border
                                ${modoOscuro ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}>
                              Editar
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); eliminar(b.id_horario); }}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15">
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                    );
                  })}
                  {hayMas && (
                    <button onClick={() => setMostrarTodos(true)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border
                        ${modoOscuro
                          ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}>
                      Ver horario ({diasConHorarios.length - 1} {diasConHorarios.length - 1 === 1 ? 'día restante' : 'días restantes'})
                    </button>
                  )}
                  {mostrarTodos && !puedeVer && diasConHorarios.length > 1 && (
                    <button onClick={() => setMostrarTodos(false)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border
                        ${modoOscuro
                          ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}>
                      Mostrar menos
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}
    </section>

      {/* Modal vista previa del alumno */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className={`relative w-full max-w-lg max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col
            ${modoOscuro ? 'bg-[#0e162c] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0
              ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                  Vista previa del alumno
                </h3>
                <p className={`text-[11px] mt-0.5 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                  Así verán el horario los miembros del club
                </p>
              </div>
              <button onClick={() => setShowPreview(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer
                  ${modoOscuro ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Icono nombre="close" className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="overflow-auto p-4 space-y-3">
              {(() => {
                const diasConHorarios = [1, 2, 3, 4, 5, 6, 0].filter(dia => horarios.some(h => h.dia_semana === dia));
                return diasConHorarios.map(dia => {
                  const bloques = horarios.filter(h => h.dia_semana === dia);
                  return (
                    <div key={dia}
                      className={`rounded-xl border overflow-hidden
                        ${modoOscuro ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`px-4 py-2.5 border-b font-bold text-xs uppercase tracking-wider
                        ${modoOscuro ? 'border-slate-700/50 text-amber-400' : 'border-slate-200 text-amber-600'}`}>
                        {DIAS[dia]}
                      </div>
                      {bloques.map(b => (
                        <div key={b.id_horario}
                          className={`px-4 py-3 border-b last:border-b-0
                            ${modoOscuro ? 'border-slate-700/30' : 'border-slate-200/60'}`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Icono nombre="clock" className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} />
                              <span className={`text-sm font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                                {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Icono nombre="location" className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/60" strokeWidth={2} />
                              <span className={`text-xs break-words ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{b.lugar}</span>
                            </div>
                            {b.descripcion && (
                              <p className={`text-xs leading-snug break-words whitespace-pre-wrap ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                                {b.descripcion}
                              </p>
                            )}
                            {b.ubicacion_maps && (
                              <a href={b.ubicacion_maps} target="_blank" rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 text-xs font-bold mt-0.5 transition-colors
                                  ${modoOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}>
                                <Icono nombre="location" className="h-3 w-3" strokeWidth={2} />
                                Ver ubicación
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacion
        show={horarioAEliminar != null}
        titulo="Eliminar horario"
        mensaje="¿Eliminar este horario?"
        textoConfirmar="Eliminar"
        varianteDanger
        onConfirmar={confirmarEliminarHorario}
        onCancelar={() => setHorarioAEliminar(null)}
      />
    </>
  );
}
