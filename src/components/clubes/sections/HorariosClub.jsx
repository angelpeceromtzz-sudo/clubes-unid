import { useState, useEffect, useMemo } from 'react';
import { Icono } from '../../ui/Icono';
import { Spinner } from '../../ui/Spinner';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { api } from '../../../services/api';
import { CalendarioGrid } from './CalendarioGrid';
import { HorarioFormModal } from './horarios/HorarioFormModal';
import { HorarioListModal } from './horarios/HorarioListModal';
import { HorarioPreviewModal } from './horarios/HorarioPreviewModal';
import { HorarioStackedView } from './horarios/HorarioStackedView';
import { ROW_HEIGHT, COL_HORA_W } from '../../../constants/horario';
import { horaStr, calcularRangoHorario } from '../../../utils/horario';
import { useHorariosActions } from './horarios/useHorariosActions';

export function HorariosClub({ club, modoOscuro, esAdmin, esPresidente, esMiembro, expandirHorarios = false }) {
  const puedeVer = esAdmin || esPresidente;
  const puedeVerNotas = esMiembro || puedeVer;

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [mostrarTodos, setMostrarTodos] = useState(expandirHorarios);
  const [drawMode, setDrawMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [horarioAEliminar, setHorarioAEliminar] = useState(null);
  const [showLista, setShowLista] = useState(false);

  const [form, setForm] = useState({
    dias_semana: [],
    hora_inicio: '09:00',
    hora_fin: '11:00',
    lugar: '',
    ubicacion_maps: '',
    descripcion: '',
  });

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

  const { horaMin, horaMax } = useMemo(() =>
    calcularRangoHorario(horarios), [horarios]
  );

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
      setError(err?.message || err?.error || 'Error al guardar');
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

  const { handleMove, handleResize, handleCreate } = useHorariosActions({ cargarHorarios, showToast, abrirCrearDesdeGrid });

  return (
    <>
    <section className={`rounded-2xl border overflow-hidden ${modoOscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200'}`}>
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl border shadow-2xl text-sm font-medium transition-all
          ${toast.tipo === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
          }`}>
          {toast.msg}
        </div>
      )}

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
                className="hidden md:inline-flex p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer">
                <Icono nombre="eye" className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            <button onClick={() => setDrawMode(prev => !prev)}
              title={drawMode ? 'Desactivar modo dibujar' : 'Activar modo dibujar'}
              className={`hidden md:inline-flex p-1.5 rounded-lg border transition-all cursor-pointer ${
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

      <HorarioFormModal
        show={showForm}
        editando={editando}
        form={form}
        enviando={enviando}
        error={error}
        modoOscuro={modoOscuro}
        onClose={() => setShowForm(false)}
        onSubmit={guardar}
        onFormChange={setForm}
        onToggleDia={toggleDia}
      />

      <HorarioListModal
        show={showLista}
        horarios={horarios}
        modoOscuro={modoOscuro}
        onClose={() => setShowLista(false)}
        onEditar={abrirEditar}
        onEliminar={eliminar}
      />

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

          <div className={`${puedeVer ? 'md:hidden' : ''}`}>
            <HorarioStackedView
              horarios={horarios}
              puedeVer={puedeVer}
              puedeVerNotas={puedeVerNotas}
              mostrarTodos={mostrarTodos}
              modoOscuro={modoOscuro}
              onToggleMostrar={() => setMostrarTodos(prev => !prev)}
              onEditar={abrirEditar}
              onEliminar={eliminar}
            />
          </div>
        </>
      )}
    </section>

      <HorarioPreviewModal
        show={showPreview}
        horarios={horarios}
        modoOscuro={modoOscuro}
        onClose={() => setShowPreview(false)}
      />

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
