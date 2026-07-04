import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Icono } from '../ui/Icono';

function BloqueCard({ convocatoria, isDark, onActualizar, onEnviar, onImprimir }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    fecha: convocatoria.fecha ? convocatoria.fecha.split('T')[0] : '',
    hora: convocatoria.hora ? convocatoria.hora.slice(0, 5) : '',
    lugar: convocatoria.lugar || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      await onActualizar(convocatoria.id_convocatoria, form);
      setEditando(false);
    } catch {
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  async function enviar() {
    setEnviando(true);
    try {
      await onEnviar(convocatoria.id_convocatoria);
    } catch { /* ignore */ } finally {
      setEnviando(false);
    }
  }

  const totalAlumnos = convocatoria.alumnos?.length || 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black shrink-0">
              {convocatoria.bloque}
            </div>
            <div>
              <h3 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Bloque {convocatoria.bloque}
              </h3>
              <p className="text-xs text-slate-500">{totalAlumnos} alumno{totalAlumnos !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {convocatoria.enviada && (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Enviada
            </span>
          )}
        </div>

        {editando ? (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Hora</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Lugar</label>
              <input
                type="text"
                value={form.lugar}
                onChange={(e) => setForm((p) => ({ ...p, lugar: e.target.value }))}
                placeholder="Edificio, salón, etc."
                className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditando(false)}
                disabled={guardando}
                className="flex-1 border border-slate-600 text-slate-300 hover:bg-slate-800 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-bold text-xs uppercase tracking-wider rounded-xl px-4 py-2 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {guardando ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-[#0e162c] border-t-transparent rounded-full" />
                ) : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Fecha</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {convocatoria.fecha ? new Date(convocatoria.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'}
              </p>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Hora</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {convocatoria.hora ? convocatoria.hora.slice(0, 5) : '—'}
              </p>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Lugar</p>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {convocatoria.lugar || '—'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setEditando((p) => !p)}
            className={`flex-1 border rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
              isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {editando ? 'Cerrar' : 'Editar fecha/hora/lugar'}
          </button>
          <button
            onClick={enviar}
            disabled={enviando || !convocatoria.fecha || !convocatoria.hora || !convocatoria.lugar}
            className="flex-1 border border-indigo-500/40 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {enviando ? (
              <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
            ) : 'Enviar convocatoria'}
          </button>
          <button
            onClick={() => onImprimir(convocatoria.id_convocatoria)}
            className="flex-1 border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
          >
            Lista de asistencia
          </button>
        </div>
      </div>

      {totalAlumnos > 0 && (
        <div className={`border-t px-5 py-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Alumnos
          </p>
          <div className="space-y-1.5">
            {convocatoria.alumnos.map((a) => (
              <div key={a.id_formulario} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-600/30 flex items-center justify-center text-slate-300 font-bold text-[9px] shrink-0">
                  {a.nombre_completo.charAt(0)}
                </div>
                <p className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{a.nombre_completo}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SeccionConvocatorias({ club, tema, modoOscuro }) {
  const [convocatorias, setConvocatorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const data = await api.getConvocatorias(club.id_club);
      setConvocatorias(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [club.id_club]);

  async function manejarActualizar(id, data) {
    await api.actualizarConvocatoria(id, data);
    setConvocatorias((prev) =>
      prev.map((c) => c.id_convocatoria === id ? { ...c, ...data } : c)
    );
  }

  async function manejarEnviar(id) {
    await api.enviarConvocatoria(id);
    setConvocatorias((prev) =>
      prev.map((c) => c.id_convocatoria === id ? { ...c, enviada: true } : c)
    );
  }

  function manejarImprimir(id) {
    const token = (() => {
      try {
        const raw = localStorage.getItem('unid_session');
        if (raw) {
          const session = JSON.parse(raw);
          return session.token || null;
        }
        return null;
      } catch {
        return null;
      }
    })();
    const base = import.meta.env.MODE === 'production'
      ? 'https://clubes-unid.onrender.com/api'
      : '/api';
    window.open(`${base}/convocatorias/${id}/asistencia?token=${token}`, '_blank');
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Convocatorias
        </h2>
        <p className={`text-sm ${tema.subtitle}`}>
          Gestiona los bloques de evaluación presencial: asigna fecha, hora y lugar, envía notificaciones e imprime listas de asistencia.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {convocatorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Icono nombre="calendar" className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay convocatorias activas</p>
          <p className="text-xs mt-0.5">Preselecciona alumnos desde la sección "Formularios" y genera las convocatorias para que aparezcan aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {convocatorias.map((c) => (
            <BloqueCard
              key={c.id_convocatoria}
              convocatoria={c}
              isDark={modoOscuro}
              onActualizar={manejarActualizar}
              onEnviar={manejarEnviar}
              onImprimir={manejarImprimir}
            />
          ))}
        </div>
      )}
    </div>
  );
}
