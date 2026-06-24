import { useState, useEffect } from 'react';
import { api } from '../../services/api';

function ModalNuevaConvocatoria({ club, preseleccionados, onClose, onCreada, tema }) {
  const [formulario, setFormulario] = useState({
    id_formulario: '',
    fecha: '',
    hora: '',
    lugar: '',
    descripcion: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function manejarEnvio(e) {
    e.preventDefault();
    if (!formulario.id_formulario || !formulario.fecha || !formulario.hora || !formulario.lugar) {
      setError('Todos los campos obligatorios deben estar llenos');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await api.createConvocatoria({
        id_formulario: parseInt(formulario.id_formulario),
        id_club: club.id_club,
        fecha: formulario.fecha,
        hora: formulario.hora,
        lugar: formulario.lugar,
        descripcion: formulario.descripcion,
      });
      onCreada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const inputCls = 'w-full bg-[#18223f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all';
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0e162c] border border-slate-700/50 rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">Nueva Convocatoria</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className={labelCls}>Alumno <span className="text-red-400">*</span></label>
            <select
              value={formulario.id_formulario}
              onChange={(e) => setFormulario((p) => ({ ...p, id_formulario: e.target.value }))}
              className={inputCls}
            >
              <option value="">Seleccionar alumno</option>
              {preseleccionados.map((al) => (
                <option key={al.id_formulario} value={al.id_formulario}>
                  {al.nombre_completo} — {al.matricula}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Fecha <span className="text-red-400">*</span></label>
            <input type="date" value={formulario.fecha} onChange={(e) => setFormulario((p) => ({ ...p, fecha: e.target.value }))} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Hora <span className="text-red-400">*</span></label>
            <input type="time" value={formulario.hora} onChange={(e) => setFormulario((p) => ({ ...p, hora: e.target.value }))} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Lugar <span className="text-red-400">*</span></label>
            <input type="text" value={formulario.lugar} onChange={(e) => setFormulario((p) => ({ ...p, lugar: e.target.value }))} placeholder="Edificio, salón, etc." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Descripción (opcional)</label>
            <textarea value={formulario.descripcion} onChange={(e) => setFormulario((p) => ({ ...p, descripcion: e.target.value }))} rows={3} placeholder="Instrucciones adicionales..." className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            {enviando ? 'Creando...' : 'Crear Convocatoria'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SeccionConvocatorias({ club, tema, modoOscuro }) {
  const [convocatorias, setConvocatorias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState('');

  async function cargarDatos() {
    try {
      const [conv, sols] = await Promise.all([
        api.getConvocatorias(club.id_club),
        api.getSolicitudesPendientes(club.id_club),
      ]);
      setConvocatorias(conv);
      setSolicitudes(sols);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [club.id_club]);

  async function eliminarConvocatoria(id) {
    if (!confirm('¿Eliminar esta convocatoria?')) return;
    try {
      await api.deleteConvocatoria(id);
      setConvocatorias((prev) => prev.filter((c) => c.id_convocatoria !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const preseleccionados = solicitudes.filter(
    (s) => s.status === 'Preseleccionado' || s.status === 'Convocado'
  );

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Convocatorias
          </h2>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            {convocatorias.length} convocatoria{convocatorias.length !== 1 ? 's' : ''} creada{convocatorias.length !== 1 ? 's' : ''}
          </p>
        </div>
        {preseleccionados.length > 0 && (
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            + Nueva Convocatoria
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {convocatorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium">No hay convocatorias activas</p>
          <p className="text-xs mt-0.5">Presiona "+ Nueva Convocatoria" para citar a un alumno preseleccionado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convocatorias.map((conv) => (
            <div
              key={conv.id_convocatoria}
              className={`rounded-xl border p-5 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                      {conv.nombre_completo?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                        {conv.nombre_completo}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{conv.matricula}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span>📅</span>
                      <span className={modoOscuro ? 'text-slate-300' : 'text-slate-700'}>
                        {new Date(conv.fecha).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>⏰</span>
                      <span className={modoOscuro ? 'text-slate-300' : 'text-slate-700'}>{conv.hora}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span>📍</span>
                      <span className={modoOscuro ? 'text-slate-300' : 'text-slate-700'}>{conv.lugar}</span>
                    </div>
                  </div>

                  {conv.descripcion && (
                    <p className={`text-sm mt-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{conv.descripcion}</p>
                  )}
                </div>

                <button
                  onClick={() => eliminarConvocatoria(conv.id_convocatoria)}
                  className="text-red-400 hover:text-red-300 transition-colors p-2 cursor-pointer shrink-0"
                  title="Eliminar convocatoria"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalNuevaConvocatoria
          club={club}
          preseleccionados={preseleccionados}
          onClose={() => setModalAbierto(false)}
          onCreada={cargarDatos}
          tema={tema}
        />
      )}
    </div>
  );
}
