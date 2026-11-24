/* Feed de actividad del club: eventos de miembros y avisos del responsable.
   Sin mensajería libre ni compositor de chat. */
import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { LoboReaccion } from '../../actividades/LoboReaccion';
import { FormularioNotificacion } from '../../formularios/FormularioNotificacion';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import '../../actividades/ReaccionesCatalogo.css';
import './ReaccionesAviso.css';

export function SeccionFeedClub({ club, esResponsableClub }) {
  const { tema, modoOscuro } = useTheme();
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAEliminar, setAvisoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [reacciones, setReacciones] = useState({});
  const [menuReaccionId, setMenuReaccionId] = useState(null);
  const [reaccionPendiente, setReaccionPendiente] = useState(null);
  const [erroresReaccion, setErroresReaccion] = useState({});

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
      try {
        const [data, propias] = await Promise.all([
          api.getAvisos(club.id_club),
          api.getMisReaccionesAvisos(club.id_club).catch(() => ({})),
        ]);
        if (montado) {
          setAvisos(data);
          setReacciones(propias || {});
        }
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

  async function confirmarEliminacion() {
    if (!avisoAEliminar) return;
    setEliminando(true);
    await manejarEliminar(avisoAEliminar);
    setEliminando(false);
    setAvisoAEliminar(null);
  }

  async function alternarReaccion(id, tipo) {
    if (reaccionPendiente === id) return;
    const actual = reacciones[id] || null;
    const destino = actual === tipo ? null : tipo;
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
      setReaccionPendiente(null);
    }
  }

  const feed = (avisos || []).map((a) => ({
    id: `a-${a.id_aviso}`,
    aviso: a,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>Avisos del Club</h3>
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
        <div className={`${cardCls} rounded-xl p-5`}>
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
      ) : feed.length === 0 ? (
        <p className={`text-sm text-center py-8 ${tema.subtitle}`}>Aún no hay avisos publicados.</p>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => {
            const aviso = item.aviso;
            const reaccionElegida = reacciones[aviso.id_aviso] || null;
            return (
              <div key={item.id} className={`${cardCls} rounded-xl p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm ${tema.title}`}>{aviso.titulo}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Por {aviso.autor} · {new Date(aviso.fecha_publicacion).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {esResponsableClub && (
                    <button
                      onClick={() => setAvisoAEliminar(aviso.id_aviso)}
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
                <div className="reacciones-aviso" data-reacciones-aviso={aviso.id_aviso} role="group" aria-label={`Reacciones para ${aviso.titulo}`}>
                  {!reaccionElegida && <button
                    type="button"
                    className={`reaccion-aviso__abrir ${menuReaccionId === aviso.id_aviso ? 'reaccion-aviso__abrir--abierta' : ''}`}
                    onClick={() => setMenuReaccionId((actual) => actual === aviso.id_aviso ? null : aviso.id_aviso)}
                    aria-expanded={menuReaccionId === aviso.id_aviso}
                    aria-haspopup="true"
                    aria-controls={`opciones-reaccion-${aviso.id_aviso}`}
                    disabled={reaccionPendiente === aviso.id_aviso}
                  >
                    <span>Reaccionar</span>
                  </button>}
                  {[
                    { tipo: 'like', nombre: 'Me gusta' },
                    { tipo: 'love', nombre: 'Me encanta' },
                    { tipo: 'clap', nombre: 'Aplausos' },
                  ].map(({ tipo, nombre }) => {
                    const seleccionada = reaccionElegida === tipo;
                    const total = Number(aviso.reacciones?.find((item) => item.reaccion === tipo)?.total || 0);
                    if (total < 1) return null;
                    return <button
                      key={`resumen-${tipo}`}
                      type="button"
                      className={`reaccion-aviso ${seleccionada ? 'reaccion-aviso--seleccionada' : ''}`}
                      onClick={() => alternarReaccion(aviso.id_aviso, tipo)}
                      disabled={reaccionPendiente === aviso.id_aviso}
                      aria-pressed={seleccionada}
                      aria-label={`${seleccionada ? 'Quitar tu reacción' : 'Reaccionar con'} ${nombre}. ${total} ${total === 1 ? 'reacción' : 'reacciones'}`}
                      title={`${nombre} · ${total}`}
                    >
                      <span className="reaccion-aviso__icono"><LoboReaccion tipo={tipo} animado={seleccionada} /></span>
                      <span className="reaccion-aviso__total">{total}</span>
                    </button>;
                  })}
                  {menuReaccionId === aviso.id_aviso && <div id={`opciones-reaccion-${aviso.id_aviso}`} className={`reacciones-aviso__opciones ${esOscuro ? 'reacciones-aviso__opciones--oscuro' : 'reacciones-aviso__opciones--claro'}`} role="group" aria-label="Elige una reacción">
                    {[
                      { tipo: 'like', nombre: 'Me gusta' },
                      { tipo: 'love', nombre: 'Me encanta' },
                      { tipo: 'clap', nombre: 'Aplausos' },
                    ].map(({ tipo, nombre }) => {
                      const seleccionada = reaccionElegida === tipo;
                      const total = Number(aviso.reacciones?.find((item) => item.reaccion === tipo)?.total || 0);
                      return <button
                        key={tipo}
                        type="button"
                        className={`reaccion-aviso ${seleccionada ? 'reaccion-aviso--seleccionada' : ''}`}
                        onClick={() => alternarReaccion(aviso.id_aviso, tipo)}
                        disabled={reaccionPendiente === aviso.id_aviso}
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

      <ModalConfirmacion
        show={!!avisoAEliminar}
        titulo="Eliminar aviso"
        mensaje="¿Deseas eliminar este aviso? Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        varianteDanger
        onConfirmar={confirmarEliminacion}
        onCancelar={() => setAvisoAEliminar(null)}
        cargando={eliminando}
      />
    </div>
  );
}
