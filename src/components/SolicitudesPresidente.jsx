import { useState, useEffect } from 'react';
import { api } from '../services/api';

const COLORES_ESTATUS = {
  'Pendiente': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'En revisión': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Preseleccionado': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Convocado': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'Admitido': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Aceptado': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Rechazado': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const SIGUIENTE_ESTATUS = {
  'Pendiente': ['En revisión', 'Rechazado'],
  'En revisión': ['Preseleccionado', 'Rechazado'],
  'Preseleccionado': ['Convocado', 'Rechazado'],
  'Convocado': ['Admitido', 'Rechazado'],
  'Aceptado': ['Rechazado'],
};

function TarjetaSolicitud({ solicitud, onCambiarEstatus, onAsignarBloque, accionando, motivoAbierto, onToggleMotivo }) {
  const cargando = accionando[solicitud.id_formulario];
  const estatusActual = solicitud.status;
  const colorEstatus = COLORES_ESTATUS[estatusActual] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  const acciones = SIGUIENTE_ESTATUS[estatusActual] || [];

  const etiquetasAccion = {
    'En revisión': { label: 'Poner en revisión', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'border-blue-500/40 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' },
    'Preseleccionado': { label: 'Preseleccionar', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'border-purple-500/40 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' },
    'Convocado': { label: 'Convocar', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'border-indigo-500/40 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' },
    'Admitido': { label: 'Admitir', icon: 'M5 13l4 4L19 7', color: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' },
    'Rechazado': { label: 'Rechazar', icon: 'M6 18L18 6M6 6l12 12', color: 'border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30' },
  };

  return (
    <div className="bg-[#0e162c] border border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-600/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              {solicitud.nombre_completo.charAt(0)}
            </div>
            <div>
              <p className="text-white text-sm font-semibold truncate">{solicitud.nombre_completo}</p>
              <p className="text-slate-500 text-[11px] font-mono">{solicitud.matricula}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Carrera</span>
              <p className="text-slate-300 text-sm truncate">{solicitud.carrera}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Turno</span>
              <p className="text-slate-300 text-sm">{solicitud.turno}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Teléfono</span>
              <p className="text-slate-300 text-sm">{solicitud.telefono_contacto}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cuatrimestre</span>
              <p className="text-slate-300 text-sm">{solicitud.cuatrimestre}°</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${colorEstatus}`}>
              {estatusActual}
            </span>
            {solicitud.bloque_asignado && solicitud.bloque_asignado !== 'E' && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-600/30 text-slate-300 border border-slate-600/50">
                Bloque {solicitud.bloque_asignado}
              </span>
            )}
          </div>

          <button
            onClick={onToggleMotivo}
            className="mt-2 text-[11px] uppercase tracking-wider text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
          >
            {motivoAbierto ? 'Ocultar motivo' : 'Ver motivo de ingreso'}
          </button>

          {motivoAbierto && (
            <div className="mt-2 bg-[#18223f] rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-300 text-sm leading-relaxed">{solicitud.motivo_ingreso}</p>
              {solicitud.experiencia_previa && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-2 mb-1">Experiencia previa</p>
                  <p className="text-slate-400 text-sm">{solicitud.experiencia_previa}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {acciones.map((estatus) => {
            const acc = etiquetasAccion[estatus];
            return (
              <button
                key={estatus}
                onClick={() => onCambiarEstatus(solicitud.id_formulario, estatus)}
                disabled={cargando}
                className={`border rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${acc.color} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {cargando ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={acc.icon} />
                  </svg>
                )}
                {acc.label}
              </button>
            );
          })}
          <select
            value={solicitud.bloque_asignado || 'E'}
            onChange={(e) => onAsignarBloque(solicitud.id_formulario, e.target.value)}
            className="bg-[#18223f] border border-slate-600 text-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            title="Asignar bloque"
          >
            <option value="E">Sin bloque</option>
            <option value="A">Bloque A</option>
            <option value="B">Bloque B</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function BloquePanel({ titulo, alumnos, esOscuro }) {
  const cardCls = esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div className={`${cardCls} rounded-2xl p-5 border`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-base font-black uppercase tracking-wider ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
          {titulo}
        </h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-600/30 text-slate-300 border border-slate-600/50">
          {alumnos.length} Alumno{alumnos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {alumnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium">Sin alumnos asignados</p>
          <p className="text-xs mt-0.5">Los alumnos aparecerán aquí al asignarles un bloque</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alumnos.map((alumno) => (
            <div
              key={alumno.id_formulario}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${esOscuro ? 'bg-[#18223f]' : 'bg-slate-100'}`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                {alumno.nombre_completo.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${esOscuro ? 'text-white' : 'text-slate-900'}`}>
                  {alumno.nombre_completo}
                </p>
                <p className="text-xs text-slate-500 font-mono">{alumno.matricula}</p>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${COLORES_ESTATUS[alumno.status] || 'bg-slate-500/20 text-slate-400'}`}>
                {alumno.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SolicitudesPresidente({ club, tema, modoOscuro }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState({});
  const [error, setError] = useState('');
  const [errorGlobal, setErrorGlobal] = useState('');
  const [motivosAbiertos, setMotivosAbiertos] = useState({});

  function toggleMotivo(id) {
    setMotivosAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setError('');
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        if (montado) setSolicitudes(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  async function manejarCambioEstatus(id, nuevoStatus) {
    setAccionando((prev) => ({ ...prev, [id]: true }));
    setErrorGlobal('');
    try {
      await api.actualizarEstatusSolicitud(id, nuevoStatus);
      setSolicitudes((prev) =>
        prev.map((s) => (s.id_formulario === id ? { ...s, status: nuevoStatus } : s))
      );
    } catch (err) {
      setErrorGlobal(err.message);
    } finally {
      setAccionando((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function manejarAsignarBloque(id, bloque) {
    setErrorGlobal('');
    try {
      await api.asignarBloque(id, bloque);
      setSolicitudes((prev) =>
        prev.map((s) => (s.id_formulario === id ? { ...s, bloque_asignado: bloque } : s))
      );
    } catch (err) {
      setErrorGlobal(err.message);
    }
  }

  const ordenEstatus = ['Pendiente', 'En revisión', 'Preseleccionado', 'Convocado', 'Admitido', 'Aceptado', 'Rechazado'];
  const agrupados = {};
  for (const est of ordenEstatus) {
    agrupados[est] = solicitudes.filter((s) => s.status === est);
  }

  const bloqueA = solicitudes.filter((s) => s.bloque_asignado === 'A');
  const bloqueB = solicitudes.filter((s) => s.bloque_asignado === 'B');
  const sinBloque = solicitudes.filter((s) => !s.bloque_asignado || s.bloque_asignado === 'E');

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {errorGlobal && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{errorGlobal}</p>
        </div>
      )}

      {error && !cargando && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {ordenEstatus.map((estatus) => {
        const items = agrupados[estatus];
        if (!items || items.length === 0) return null;
        const colorEstatus = COLORES_ESTATUS[estatus] || 'bg-slate-500/20 text-slate-400';

        return (
          <div key={estatus}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
                {estatus}
              </h2>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${colorEstatus}`}>
                {items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {items.map((solicitud, i) => {
                const cardKey = solicitud.id_formulario ?? `solicitud-${i}`;
                return (
                  <TarjetaSolicitud
                    key={cardKey}
                    solicitud={solicitud}
                    onCambiarEstatus={manejarCambioEstatus}
                    onAsignarBloque={manejarAsignarBloque}
                    accionando={accionando}
                    motivoAbierto={!!motivosAbiertos[cardKey]}
                    onToggleMotivo={() => toggleMotivo(cardKey)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {solicitudes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">No hay postulaciones</p>
          <p className="text-xs mt-0.5">Las solicitudes de alumnos aparecerán aquí</p>
        </div>
      )}

      {(bloqueA.length > 0 || bloqueB.length > 0) && (
        <div>
          <h2 className={`text-lg font-black uppercase tracking-wider mb-4 ${tema.title}`}>
            Bloques Asignados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BloquePanel titulo="Bloque A" alumnos={bloqueA} esOscuro={modoOscuro} />
            <BloquePanel titulo="Bloque B" alumnos={bloqueB} esOscuro={modoOscuro} />
          </div>
        </div>
      )}
    </div>
  );
}
