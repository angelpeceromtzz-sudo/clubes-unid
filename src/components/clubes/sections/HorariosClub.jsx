import { useState, useEffect } from 'react';
import { Icono } from '../../ui/Icono';
import { Spinner } from '../../ui/Spinner';
import { BotonAccion } from '../../ui/BotonAccion';
import { api } from '../../../services/api';

export function HorariosClub({ club, modoOscuro, esAdmin, esPresidente }) {
  const c = {
    bg: modoOscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200',
    text: modoOscuro ? 'text-slate-300' : 'text-slate-600',
    title: modoOscuro ? 'text-white' : 'text-slate-900',
    input: modoOscuro
      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
  };

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ fecha: '', hora: '', lugar: '', ubicacion_maps: '' });
  const [enviando, setEnviando] = useState(false);
  const puedeEditar = esAdmin || esPresidente;

  useEffect(() => {
    if (club?.id_club) {
      cargarHorarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id_club]);

  async function cargarHorarios() {
    try {
      const data = await api.getHorarios(club.id_club);
      setHorarios(data);
    } catch {
      setHorarios([]);
    } finally {
      setCargando(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ fecha: '', hora: '', lugar: '', ubicacion_maps: '' });
    setShowForm(true);
  }

  function abrirEditar(e) {
    setEditando(e);
    setForm({
      fecha: e.fecha?.split('T')[0] || e.fecha,
      hora: e.hora?.split('T')[1]?.split('+')[0]?.split('.')[0]?.slice(0, 5) || e.hora?.slice(0, 5),
      lugar: e.lugar,
      ubicacion_maps: e.ubicacion_maps || '',
    });
    setShowForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.fecha || !form.hora || !form.lugar) return;
    setEnviando(true);
    try {
      if (editando) {
        await api.updateHorario(editando.id_horario, form);
      } else {
        await api.createHorario(club.id_club, form);
      }
      setShowForm(false);
      await cargarHorarios();
    } catch {
      /* error silently handled */
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await api.deleteHorario(id);
      await cargarHorarios();
    } catch {
      /* error silently handled */
    }
  }

  return (
    <section className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modoOscuro ? 'bg-amber-500/10' : 'bg-amber-100'}`}>
            <Icono nombre="clock" strokeWidth={2} className={`h-5 w-5 ${modoOscuro ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h2 className={`text-xl font-black tracking-tight ${c.title}`}>Horarios</h2>
        </div>
        {puedeEditar && !showForm && (
          <button onClick={abrirNuevo} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer">
            <Icono nombre="plus" className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={guardar} className={`mb-6 p-4 rounded-xl border ${modoOscuro ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider ${c.title}`}>Fecha</label>
              <input type="date" name="fecha" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required
                className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-medium ${c.input}`} />
            </div>
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider ${c.title}`}>Hora</label>
              <input type="time" name="hora" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} required
                className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-medium ${c.input}`} />
            </div>
          </div>
          <div className="mb-3">
            <label className={`text-xs font-bold uppercase tracking-wider ${c.title}`}>Lugar</label>
            <input type="text" name="lugar" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} required placeholder="Ej: Gimnasio Universitario"
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-medium ${c.input}`} />
          </div>
          <div className="mb-3">
            <label className={`text-xs font-bold uppercase tracking-wider ${c.title}`}>
              Ubicación (Google Maps)
              <span className={`ml-1 text-[10px] font-normal ${c.text}`}>(enlace o embed URL)</span>
            </label>
            <input type="url" name="ubicacion_maps" value={form.ubicacion_maps} onChange={(e) => setForm({ ...form, ubicacion_maps: e.target.value })} placeholder="https://maps.google.com/?q=..."
              className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm font-medium ${c.input}`} />
          </div>
          <div className="flex gap-2">
            <BotonAccion type="submit" disabled={enviando} variant="primary" size="sm">
              {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Agregar'}
            </BotonAccion>
            <BotonAccion onClick={() => setShowForm(false)} variant="outline" size="sm">Cancelar</BotonAccion>
          </div>
        </form>
      )}

      {cargando ? (
        <Spinner className="py-8" />
      ) : horarios.length === 0 ? (
        <p className={`text-sm ${c.text}`}>No hay horarios registrados aún.</p>
      ) : (
        <div className="space-y-3">
          {horarios.map((h) => (
            <div key={h.id_horario} className={`rounded-xl border p-4 ${modoOscuro ? 'bg-slate-800/30 border-slate-700/30' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-bold mb-1">
                    <Icono nombre="calendar" className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />
                    <span className={c.title}>
                      {new Date(h.fecha + 'T' + (h.hora || '00:00')).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Icono nombre="clock" className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />
                    <span className={c.text}>{h.hora?.slice(0, 5)} hrs</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Icono nombre="location" className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />
                    <span className={c.text}>{h.lugar}</span>
                  </div>
                  {h.ubicacion_maps && (
                    <div className="mt-2">
                      <a href={h.ubicacion_maps} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                        <Icono nombre="map-pin" className="h-3.5 w-3.5" strokeWidth={2} />
                        Ver en Google Maps
                      </a>
                    </div>
                  )}
                </div>
                {puedeEditar && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => abrirEditar(h)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${modoOscuro ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}>
                      <Icono nombre="edit" className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button onClick={() => eliminar(h.id_horario)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${modoOscuro ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                      <Icono nombre="trash" className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
