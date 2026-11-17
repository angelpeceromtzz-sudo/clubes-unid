import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { FormularioNotificacion } from '../../formularios/FormularioNotificacion';
import { api } from '../../../services/api';
import { Alerta } from '../../ui/Alerta';
import { Spinner } from '../../ui/Spinner';
import { Icono } from '../../ui/Icono';

const AUDIENCIAS = [
  { value: 'global', label: 'Global (Todos los usuarios)' },
  { value: 'presidentes', label: 'Solo Presidentes' },
  { value: 'alumnos', label: 'Solo Alumnos' },
  { value: 'club', label: 'Club en Específico' },
];

export function SeccionAnuncios({ clubes, onSuccess }) {
  const { tema, cardCls } = useTheme();
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({ titulo: '', mensaje: '', audiencia: 'global', id_club: '' });
  const [guardando, setGuardando] = useState(false);
  const [feedbackEdit, setFeedbackEdit] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await api.getMisAnuncios();
      setAnuncios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Error al cargar anuncios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;
    (async () => {
      if (!montado) return;
      await cargar();
    })();
    return () => { montado = false; };
  }, [cargar]);

  function abrirEdicion(anuncio) {
    setEditando(anuncio);
    setFormEdit({
      titulo: anuncio.titulo || '',
      mensaje: anuncio.mensaje || '',
      audiencia: anuncio.audiencia || 'global',
      id_club: anuncio.id_club ? String(anuncio.id_club) : '',
    });
    setFeedbackEdit('');
  }

  function cerrarEdicion() {
    setEditando(null);
    setFeedbackEdit('');
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    if (!editando) return;
    if (!formEdit.titulo.trim() || !formEdit.mensaje.trim()) return;
    if (formEdit.audiencia === 'club' && !formEdit.id_club) return;

    const password = window.prompt('Ingresa la contraseña de administrador para modificar el anuncio:');
    if (!password) return;

    setGuardando(true);
    setFeedbackEdit('');
    try {
      await api.updateNotificacion(editando.id_notificacion, {
        titulo: formEdit.titulo.trim(),
        mensaje: formEdit.mensaje.trim(),
        audiencia: formEdit.audiencia,
        id_club: formEdit.audiencia === 'club' ? Number(formEdit.id_club) : null,
        password,
      });
      setFeedbackEdit('Anuncio modificado correctamente');
      await cargar();
      if (onSuccess) onSuccess();
    } catch (err) {
      setFeedbackEdit('');
      setError(err?.message || 'Error al modificar el anuncio');
    } finally {
      setGuardando(false);
    }
  }

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-amber-400/50 ${tema.inputBorder || ''}`;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Izquierda: formulario de creación */}
      <div className="flex-1 max-w-2xl">
        <div className={`rounded-2xl p-6 ${cardCls || 'bg-white border border-slate-200'}`}>
          <h2 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
            Publicar anuncio
          </h2>
          <p className={`text-sm mb-6 ${tema.subtitle}`}>
            Comparte un anuncio y elige quién lo recibe.
          </p>
          <FormularioNotificacion
            clubes={clubes}
            onSuccess={() => {
              if (onSuccess) onSuccess();
              cargar();
            }}
            requiereSecret
          />
        </div>
      </div>

      {/* Derecha: anuncios creados */}
      <div className="flex-1">
        <div className={`rounded-2xl p-6 ${cardCls || 'bg-white border border-slate-200'}`}>
          <h2 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
            Mis anuncios
          </h2>
          <p className={`text-sm mb-6 ${tema.subtitle}`}>
            Anuncios que has publicado. Puedes modificarlos sin afectar quién ya los leyó.
          </p>

          {error && <Alerta tipo="error" mensaje={error} />}

          {cargando ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : anuncios.length === 0 ? (
            <p className={`text-sm ${tema.subtitle}`}>Aún no has publicado anuncios.</p>
          ) : (
            <ul className="space-y-3">
              {anuncios.map((a) => (
                <li key={a.id_notificacion} className={`rounded-xl border p-4 ${tema.cardBorder || 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-bold text-sm ${tema.title}`}>{a.titulo}</p>
                      <p className={`text-xs mt-1 ${tema.subtitle} line-clamp-2`}>{a.mensaje}</p>
                      <p className={`text-[10px] mt-2 uppercase tracking-wider ${tema.subtitle}`}>
                        {a.audiencia} {a.nombre_club ? `· ${a.nombre_club}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirEdicion(a)}
                      className="shrink-0 p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors cursor-pointer"
                      title="Modificar anuncio"
                    >
                      <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {feedbackEdit && <div className="mt-4"><Alerta tipo="success" mensaje={feedbackEdit} /></div>}

          {/* Modal/form de edición */}
          {editando && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className={`w-full max-w-lg rounded-2xl p-6 ${cardCls || 'bg-white border border-slate-200'}`}>
                <h3 className={`text-lg font-black uppercase tracking-wider mb-4 ${tema.title}`}>
                  Modificar anuncio
                </h3>
                <form onSubmit={guardarEdicion} className="space-y-4">
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}>Título</label>
                    <input
                      value={formEdit.titulo}
                      onChange={(e) => setFormEdit((p) => ({ ...p, titulo: e.target.value }))}
                      maxLength={100}
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}>Contenido</label>
                    <textarea
                      value={formEdit.mensaje}
                      onChange={(e) => setFormEdit((p) => ({ ...p, mensaje: e.target.value }))}
                      maxLength={500}
                      required
                      rows={4}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}>Audiencia</label>
                    <select
                      value={formEdit.audiencia}
                      onChange={(e) => setFormEdit((p) => ({ ...p, audiencia: e.target.value, id_club: '' }))}
                      className={inputClass}
                    >
                      {AUDIENCIAS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  {formEdit.audiencia === 'club' && (
                    <div>
                      <label className={`text-xs font-bold uppercase tracking-wider ${tema.subtitle}`}>Club</label>
                      <select
                        value={formEdit.id_club}
                        onChange={(e) => setFormEdit((p) => ({ ...p, id_club: e.target.value }))}
                        className={inputClass}
                        required
                      >
                        <option value="">Seleccionar club</option>
                        {(clubes || []).map((c) => (
                          <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {error && <Alerta tipo="error" mensaje={error} />}
                  {feedbackEdit && <Alerta tipo="success" mensaje={feedbackEdit} />}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={guardando}
                      className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-6 py-3 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={cerrarEdicion}
                      className="px-6 py-3 rounded-xl border text-sm font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}