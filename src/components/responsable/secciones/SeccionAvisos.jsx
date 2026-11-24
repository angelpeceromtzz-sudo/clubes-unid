/* Sección de avisos del club: lista y crea publicaciones visibles para los miembros. */
import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { LoboReaccion } from '../../actividades/LoboReaccion';
import { FormularioNotificacion } from '../../formularios/FormularioNotificacion';
import '../../actividades/ReaccionesCatalogo.css';
import './ReaccionesAviso.css';

const TIPOS_REACCION_AVISO = [
  { tipo: 'like', nombre: 'Me gusta' },
  { tipo: 'love', nombre: 'Me encanta' },
  { tipo: 'clap', nombre: 'Aplausos' },
];

export function SeccionAvisos({ club, esResponsableClub }) {
  const { tema, modoOscuro } = useTheme();
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [reacciones, setReacciones] = useState({});
  const [menuReaccionId, setMenuReaccionId] = useState(null);
  const [reaccionPendiente, setReaccionPendiente] = useState(null);
  const [erroresReaccion, setErroresReaccion] = useState({});
  const reaccionPendienteRef = useRef(null);

  const esOscuro = modoOscuro;
  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  useEffect(() => {
    if (menuReaccionId == null) return undefined;
    const cerrarFuera = (evento) => {
      const objetivo = evento.target;
      const grupo = objetivo instanceof Element ? objetivo.closest('[data-reacciones-aviso]') : null;
      if (!grupo || grupo.dataset.reaccionesAviso !== String(menuReaccionId)) setMenuReaccionId(null);
    };
    const cerrarEscape = (evento) => { if (evento.key === 'Escape') setMenuReaccionId(null); };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [menuReaccionId]);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setCargando(true);
      setErrorCarga('');
      try {
        const [resultadoAvisos, resultadoReacciones] = await Promise.allSettled([
          api.getAvisos(club.id_club),
          api.getMisReaccionesAvisos(club.id_club),
        ]);
        if (montado) {
          setAvisos(resultadoAvisos.status === 'fulfilled' ? resultadoAvisos.value : []);
          setReacciones(resultadoReacciones.status === 'fulfilled' ? (resultadoReacciones.value || {}) : {});
          if (resultadoAvisos.status === 'rejected') {
            setErrorCarga(resultadoAvisos.reason?.message || 'No se pudieron cargar los avisos.');
          } else if (resultadoReacciones.status === 'rejected') {
            setErrorCarga(resultadoReacciones.reason?.message || 'No se pudieron cargar tus reacciones.');
          }
        }
      } catch (err) {
        if (montado) {
          setAvisos([]);
          setErrorCarga(err.message || 'No se pudieron cargar los avisos.');
        }
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
      setErrorCarga('');
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los avisos.');
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

  async function alternarReaccion(id, tipo) {
    if (reaccionPendienteRef.current !== null) return;
    const actual = reacciones[id] || null;
    const destino = actual === tipo ? null : tipo;
    reaccionPendienteRef.current = id;
    setReaccionPendiente(id);
    setErroresReaccion((prev) => ({ ...prev, [id]: '' }));
    try {
      const resultado = await api.guardarReaccionAviso(id, destino);
      setReacciones((prev) => {
        const siguiente = { ...prev };
        if (resultado.reaccion) siguiente[id] = resultado.reaccion;
        else delete siguiente[id];
        return siguiente;
      });
      setAvisos((prev) => prev.map((aviso) => aviso.id_aviso === id
        ? { ...aviso, reacciones: resultado.totales || [] }
        : aviso));
      setMenuReaccionId(null);
    } catch (error) {
      setErroresReaccion((prev) => ({ ...prev, [id]: error.message || 'No se pudo guardar la reacción.' }));
    } finally {
      if (reaccionPendienteRef.current === id) reaccionPendienteRef.current = null;
      setReaccionPendiente(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Avisos del Club
        </h3>
        {esResponsableClub && (
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
        <div className="flex justify-center py-8" role="status" aria-label="Cargando avisos">
          <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {errorCarga && <p className="text-sm text-center py-2 text-red-400" role="alert">{errorCarga}</p>}
          {avisos.length === 0 && !errorCarga && (
            <p className={`text-sm text-center py-8 ${tema.subtitle}`}>
              No hay avisos publicados aún.
            </p>
          )}
          {avisos.map((aviso) => {
            const reaccionElegida = reacciones[aviso.id_aviso] || null;
            const pendiente = reaccionPendiente === aviso.id_aviso;
            return (
              <div key={aviso.id_aviso} className={`${cardCls} rounded-xl p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm ${tema.title}`}>{aviso.titulo}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Por {aviso.autor} &middot; {new Date(aviso.fecha_publicacion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {esResponsableClub && (
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
                <div className="reacciones-aviso" data-reacciones-aviso={aviso.id_aviso} role="group" aria-label={`Reacciones para ${aviso.titulo}`} aria-busy={pendiente}>
                  {!reaccionElegida && <button
                    type="button"
                    className={`reaccion-aviso__abrir ${menuReaccionId === aviso.id_aviso ? 'reaccion-aviso__abrir--abierta' : ''}`}
                    onClick={() => setMenuReaccionId((actual) => actual === aviso.id_aviso ? null : aviso.id_aviso)}
                    aria-expanded={menuReaccionId === aviso.id_aviso}
                    aria-haspopup="true"
                    aria-controls={`opciones-reaccion-${aviso.id_aviso}`}
                    disabled={pendiente}
                  >
                    <span>Reaccionar</span>
                  </button>}
                  {TIPOS_REACCION_AVISO.map(({ tipo, nombre }) => {
                    const seleccionada = reaccionElegida === tipo;
                    const total = Number(aviso.reacciones?.find((item) => item.reaccion === tipo)?.total || 0);
                    if (total < 1) return null;
                    return <button
                      key={`resumen-${tipo}`}
                      type="button"
                      className={`reaccion-aviso ${seleccionada ? 'reaccion-aviso--seleccionada' : ''}`}
                      onClick={() => alternarReaccion(aviso.id_aviso, tipo)}
                      disabled={pendiente}
                      aria-pressed={seleccionada}
                      aria-label={`${seleccionada ? 'Quitar tu reacción' : 'Reaccionar con'} ${nombre}. ${total} ${total === 1 ? 'reacción' : 'reacciones'}`}
                      title={`${nombre} · ${total}`}
                    >
                      <span className="reaccion-aviso__icono"><LoboReaccion tipo={tipo} animado={seleccionada} /></span>
                      <span className="reaccion-aviso__total">{total}</span>
                    </button>;
                  })}
                  {menuReaccionId === aviso.id_aviso && <div id={`opciones-reaccion-${aviso.id_aviso}`} className={`reacciones-aviso__opciones ${esOscuro ? 'reacciones-aviso__opciones--oscuro' : 'reacciones-aviso__opciones--claro'}`} role="group" aria-label="Elige una reacción">
                    {TIPOS_REACCION_AVISO.map(({ tipo, nombre }) => {
                      const seleccionada = reaccionElegida === tipo;
                      const total = Number(aviso.reacciones?.find((item) => item.reaccion === tipo)?.total || 0);
                      return <button
                        key={tipo}
                        type="button"
                        className={`reaccion-aviso ${seleccionada ? 'reaccion-aviso--seleccionada' : ''}`}
                        onClick={() => alternarReaccion(aviso.id_aviso, tipo)}
                        disabled={pendiente}
                        aria-pressed={seleccionada}
                        aria-label={`${seleccionada ? 'Quitar' : 'Reaccionar con'} ${nombre}${total ? `. ${total} ${total === 1 ? 'reacción' : 'reacciones'}` : ''}`}
                        title={`${nombre}${total ? ` · ${total}` : ''}`}
                      >
                        <span className="reaccion-aviso__icono"><LoboReaccion tipo={tipo} animado={seleccionada} /></span>
                        {total > 0 && <span className="reaccion-aviso__total">{total}</span>}
                      </button>;
                    })}
                  </div>}
                </div>
                {erroresReaccion[aviso.id_aviso] && <p className="mt-1 text-xs text-red-400" role="alert">{erroresReaccion[aviso.id_aviso]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
