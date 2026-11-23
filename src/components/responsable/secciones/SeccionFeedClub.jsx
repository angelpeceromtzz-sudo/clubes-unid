/* Feed de actividad del club: eventos de miembros y avisos del responsable.
   Sin mensajería libre ni compositor de chat. */
import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';
import { FormularioNotificacion } from '../../formularios/FormularioNotificacion';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';

export function SeccionFeedClub({ club, miembros = [], esResponsableClub }) {
  const { tema, modoOscuro } = useTheme();
  const [avisos, setAvisos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAEliminar, setAvisoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [reacciones, setReacciones] = useState({});

  const esOscuro = modoOscuro;
  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

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

  async function confirmarEliminacion() {
    if (!avisoAEliminar) return;
    setEliminando(true);
    await manejarEliminar(avisoAEliminar);
    setEliminando(false);
    setAvisoAEliminar(null);
  }

  function alternarReaccion(id) {
    setReacciones((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const eventosMiembros = (miembros || []).slice(0, 5).map((m) => ({
    tipo: 'miembro',
    id: `m-${m.id_usuario || m.id}`,
    texto: `${m.nombre_completo || m.nombre || 'Un alumno'} se unió al club`,
    fecha: m.fecha_ingreso || m.fecha || null,
  }));

  const eventosAvisos = (avisos || []).map((a) => ({
    tipo: 'aviso',
    id: `a-${a.id_aviso}`,
    aviso: a,
  }));

  const feed = [...eventosMiembros, ...eventosAvisos];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>Actividad del Club</h3>
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
        <p className={`text-sm text-center py-8 ${tema.subtitle}`}>Sin actividad reciente.</p>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => {
            if (item.tipo === 'miembro') {
              return (
                <div key={item.id} className={`${cardCls} rounded-xl p-4 flex items-center gap-3`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <p className={`text-sm ${tema.title}`}>{item.texto}</p>
                  {item.fecha && <span className="text-xs text-slate-500 ml-auto">{new Date(item.fecha).toLocaleDateString('es-MX')}</span>}
                </div>
              );
            }
            const aviso = item.aviso;
            const reaccionado = !!reacciones[aviso.id_aviso];
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
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alternarReaccion(aviso.id_aviso)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      reaccionado
                        ? 'bg-amber-400/20 border-amber-400/40 text-amber-400'
                        : esOscuro
                          ? 'border-slate-700 text-slate-400 hover:text-amber-400'
                          : 'border-slate-200 text-slate-500 hover:text-amber-500'
                    }`}
                    aria-pressed={reaccionado}
                  >
                    <Icono nombre="thumbs-up" className="h-3.5 w-3.5" />
                    {reaccionado ? 'Te gustó' : 'Me gusta'}
                  </button>
                </div>
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