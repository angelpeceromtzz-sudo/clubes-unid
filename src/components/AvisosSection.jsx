import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AvisosSection({ club, esPresidente, tema, modoOscuro }) {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoContenido, setNuevoContenido] = useState('');
  const [pubError, setPubError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await api.getAvisos(club.id_club);
        if (mounted) setAvisos(data);
      } catch {
        if (mounted) setAvisos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [club.id_club]);

  async function refreshAvisos() {
    try {
      const data = await api.getAvisos(club.id_club);
      setAvisos(data);
    } catch {
      setAvisos([]);
    }
  }

  async function handlePublicar(e) {
    e.preventDefault();
    setPubError('');
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return;

    try {
      await api.createAviso(club.id_club, nuevoTitulo, nuevoContenido);
      await refreshAvisos();
      setNuevoTitulo('');
      setNuevoContenido('');
      setShowForm(false);
    } catch (err) {
      setPubError(err.message);
    }
  }

  async function handleEliminar(id) {
    try {
      await api.deleteAviso(id);
      await refreshAvisos();
    } catch (err) {
      console.error('Error al eliminar aviso:', err);
    }
  }

  const isDark = modoOscuro;
  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Avisos del Club
        </h3>
        {esPresidente && (
          <button
            onClick={() => setShowForm((p) => !p)}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2 transition-all duration-200 cursor-pointer active:scale-95"
          >
            {showForm ? 'Cancelar' : 'Nuevo Aviso'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handlePublicar} className={`${cardCls} rounded-xl p-5 mb-5 space-y-3`}>
          <input
            type="text"
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            placeholder="Título del aviso"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isDark ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'}`}
          />
          <textarea
            value={nuevoContenido}
            onChange={(e) => setNuevoContenido(e.target.value)}
            placeholder="Contenido del aviso"
            rows={3}
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none ${isDark ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'}`}
          />
          {pubError && <p className="text-red-400 text-xs font-medium">{pubError}</p>}
          <button
            type="submit"
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-2.5 transition-all duration-200 cursor-pointer active:scale-95"
          >
            Publicar
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {avisos.length === 0 && (
            <p className={`text-sm text-center py-8 ${tema.subtitle}`}>
              No hay avisos publicados aún.
            </p>
          )}
          {avisos.map((aviso) => (
            <div key={aviso.id_aviso} className={`${cardCls} rounded-xl p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${tema.title}`}>{aviso.titulo}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Por {aviso.autor} &middot; {new Date(aviso.fecha_publicacion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {esPresidente && (
                  <button
                    onClick={() => handleEliminar(aviso.id_aviso)}
                    className="text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0"
                    title="Eliminar aviso"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <p className={`text-sm mt-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {aviso.contenido}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
