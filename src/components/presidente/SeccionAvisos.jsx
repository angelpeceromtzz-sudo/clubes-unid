/* Sección de avisos del club: lista y crea publicaciones visibles para los miembros. */
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { FormularioNotificacion } from '../formularios/FormularioNotificacion';

export function SeccionAvisos({ club, esPresidente }) {
  const { tema, modoOscuro } = useTheme();
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getAvisos(club.id_club);
        if (montado) setAvisos(data);
      } catch {
        if (montado) setAvisos([]);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  async function refrescarAvisos() {
    try {
      const data = await api.getAvisos(club.id_club);
      setAvisos(data);
    } catch {
      setAvisos([]);
    }
  }

  async function manejarPublicar(titulo, contenido) {
    try {
      await api.createAviso(club.id_club, titulo, contenido);
      await refrescarAvisos();
      setMostrarFormulario(false);
    } catch (err) {
      console.error('Error al crear aviso:', err);
    }
  }

  async function manejarEliminar(id) {
    try {
      await api.deleteAviso(id);
      await refrescarAvisos();
    } catch (err) {
      console.error('Error al eliminar aviso:', err);
    }
  }

  const esOscuro = modoOscuro;
  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Avisos del Club
        </h3>
        {esPresidente && (
          <button
            onClick={() => setMostrarFormulario((p) => !p)}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-2 transition-all duration-200 cursor-pointer active:scale-95"
          >
            {mostrarFormulario ? 'Cancelar' : 'Nuevo Aviso'}
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <div className={`${cardCls} rounded-xl p-5 mb-5`}>
          <p className={`text-sm mb-4 ${tema.subtitle}`}>
            Este anuncio se enviará como notificación a todos los alumnos inscritos en {club.nombre_club}.
          </p>
          <FormularioNotificacion
            audienciaFija="club"
            clubId={club.id_club}
            clubNombre={club.nombre_club}
            onSuccess={manejarPublicar}
          />
        </div>
      )}

      {cargando ? (
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
                    onClick={() => manejarEliminar(aviso.id_aviso)}
                    className="text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0"
                    title="Eliminar aviso"
                  >
                    <Icono nombre="trash" strokeWidth={1.5} className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className={`text-sm mt-3 leading-relaxed ${esOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                {aviso.contenido}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
