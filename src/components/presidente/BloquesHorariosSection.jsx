import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PanelBloqueMejorado } from './BloquePanelMejorado';
import { ModalConfirmarSeleccion } from './ModalConfirmarSeleccion';
import { Icono } from '../ui/Icono';

const COLORES_ESTATUS = {
  'Pendiente': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Postulado': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'En revisión': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Preseleccionado': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Convocado': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Oferta emitida': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Miembro oficial': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Oferta rechazada': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Oferta expirada': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'No seleccionado': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Rechazado': 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function SeccionBloquesHorarios({ club, tema, modoOscuro }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [convocando, setConvocando] = useState(false);
  const [error, setError] = useState('');
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        if (montado) {
          setSolicitudes(data);
          setSeleccionados([]);
          setCompletado(false);
          setError('');
        }
      } catch {
        if (montado) setSolicitudes([]);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  const preseleccionadosConBloque = solicitudes.filter(
    (s) => s.status === 'Preseleccionado' && s.bloque_asignado && s.bloque_asignado !== 'E'
  );
  const preseleccionadosSinBloque = solicitudes.filter(
    (s) => s.status === 'Preseleccionado' && (!s.bloque_asignado || s.bloque_asignado === 'E')
  );
  const convocados = solicitudes.filter((s) => s.status === 'Convocado');
  const bloqueA = convocados.filter((s) => s.bloque_asignado === 'A');
  const bloqueB = convocados.filter((s) => s.bloque_asignado === 'B');

  function toggleSeleccion(id) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const todosLosIds = [...bloqueA, ...bloqueB].map((a) => a.id_formulario);
  const todosSeleccionados = seleccionados.length === todosLosIds.length && todosLosIds.length > 0;

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados([]);
    } else {
      setSeleccionados(todosLosIds);
    }
  }

  function abrirModal() {
    setError('');
    setMostrarModal(true);
  }

  const noSeleccionados = [...bloqueA, ...bloqueB].filter(
    (a) => !seleccionados.includes(a.id_formulario)
  );

  async function confirmarSeleccion() {
    setConfirmando(true);
    setError('');
    try {
      await api.seleccionarOfertas(club.id_club, seleccionados);
      setMostrarModal(false);
      setCompletado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmando(false);
    }
  }

  async function convocarPreseleccionados() {
    setConvocando(true);
    setError('');
    try {
      for (const s of preseleccionadosConBloque) {
        await api.actualizarEstatusSolicitud(s.id_formulario, 'Convocado');
      }
      const data = await api.getSolicitudesPendientes(club.id_club);
      setSolicitudes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setConvocando(false);
    }
  }

  async function asignarBloqueYConvocar(id, bloque) {
    setError('');
    try {
      await api.asignarBloque(id, bloque);
      await api.actualizarEstatusSolicitud(id, 'Convocado');
      const data = await api.getSolicitudesPendientes(club.id_club);
      setSolicitudes(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Bloques y Horarios
        </h2>
        <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Gestiona la convocatoria a evaluación presencial y la selección final de alumnos.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {completado && (
        <div className={`rounded-xl p-4 border ${modoOscuro ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2">
            <Icono nombre="check-circle" className="h-5 w-5 text-emerald-500 shrink-0" strokeWidth={2.5} />
            <p className="text-sm font-medium text-emerald-500">
              Ofertas de ingreso enviadas exitosamente. Los alumnos seleccionados recibirán una notificación.
            </p>
          </div>
        </div>
      )}

      {/* Sección: Preseleccionados con bloque — listos para convocar */}
      {preseleccionadosConBloque.length > 0 && (
        <div className={`rounded-2xl p-5 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-black uppercase tracking-wider ${tema.title}`}>
                Preseleccionados con bloque
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {preseleccionadosConBloque.length}
              </span>
            </div>
            <button
              onClick={convocarPreseleccionados}
              disabled={convocando}
              className="border border-indigo-500/40 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
            >
              {convocando ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Icono nombre="video-camera" className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              Convocar todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {preseleccionadosConBloque.map((s) => (
              <div key={s.id_formulario} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                  {s.nombre_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{s.nombre_completo}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{s.matricula} · Bloque {s.bloque_asignado}</p>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Preseleccionado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección: Preseleccionados sin bloque — asignar bloque y convocar */}
      {preseleccionadosSinBloque.length > 0 && (
        <div className={`rounded-2xl p-5 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className={`text-base font-black uppercase tracking-wider mb-4 ${tema.title}`}>
            Preseleccionados sin bloque
          </h3>
          <div className="space-y-2">
            {preseleccionadosSinBloque.map((s) => (
              <div key={s.id_formulario} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${modoOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
                  {s.nombre_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{s.nombre_completo}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{s.matricula}</p>
                </div>
                <select
                  onChange={(e) => {
                    const bloque = e.target.value;
                    if (bloque) asignarBloqueYConvocar(s.id_formulario, bloque);
                    e.target.value = '';
                  }}
                  className="bg-[#18223f] border border-slate-600 text-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <option value="">Asignar bloque</option>
                  <option value="A">Bloque A</option>
                  <option value="B">Bloque B</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección: Convocados — selección para oferta */}
      {convocados.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={toggleTodos}
                className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors ${
                  todosSeleccionados
                    ? 'bg-emerald-500 border-emerald-500'
                    : modoOscuro ? 'border-slate-600' : 'border-slate-400'
                }`}
              >
                {todosSeleccionados && (
                  <Icono nombre="check" className="h-full w-full text-white" strokeWidth={3} />
                )}
              </div>
              <span className={`text-xs uppercase font-bold tracking-wider ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </span>
            </label>
            <span className={`text-xs font-medium ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
              ({seleccionados.length} de {convocados.length} seleccionados)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PanelBloqueMejorado
              titulo="Bloque A"
              alumnos={bloqueA}
              isDark={modoOscuro}
              seleccionados={seleccionados}
              onToggleSeleccion={toggleSeleccion}
            />
            <PanelBloqueMejorado
              titulo="Bloque B"
              alumnos={bloqueB}
              isDark={modoOscuro}
              seleccionados={seleccionados}
              onToggleSeleccion={toggleSeleccion}
            />
          </div>

          {!completado && (
            <button
              onClick={abrirModal}
              disabled={seleccionados.length === 0}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icono nombre="check-circle" className="h-5 w-5" strokeWidth={2.5} />
              Confirmar selección
            </button>
          )}
        </>
      )}

      {convocados.length === 0 && preseleccionadosConBloque.length === 0 && preseleccionadosSinBloque.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Icono nombre="users" className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay alumnos para gestionar</p>
          <p className="text-xs mt-0.5">
            Preselecciona alumnos desde la sección "Solicitudes" para que aparezcan aquí
          </p>
        </div>
      )}

      {mostrarModal && (
        <ModalConfirmarSeleccion
          isDark={modoOscuro}
          aceptados={[...bloqueA, ...bloqueB].filter((a) => seleccionados.includes(a.id_formulario))}
          noSeleccionados={noSeleccionados}
          onConfirmar={confirmarSeleccion}
          onCancelar={() => setMostrarModal(false)}
          cargando={confirmando}
        />
      )}
    </div>
  );
}
