import { useState, useEffect } from 'react';
import { api } from '../services/api';

function TarjetaSolicitud({ solicitud, onAceptar, onRechazar, accionando }) {
  const [motivoAbierto, setMotivoAbierto] = useState(false);
  const cargando = accionando[solicitud.id_formulario];

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

          <button
            onClick={() => setMotivoAbierto((p) => !p)}
            className="mt-2 text-[11px] uppercase tracking-wider text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
          >
            {motivoAbierto ? 'Ocultar motivo' : 'Ver motivo de ingreso'}
          </button>

          {motivoAbierto && (
            <div className="mt-2 bg-[#18223f] rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-300 text-sm leading-relaxed">{solicitud.motivo_ingreso}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => onAceptar(solicitud.id_formulario)}
            disabled={cargando}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            {cargando ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            Aceptar
          </button>
          <button
            onClick={() => onRechazar(solicitud.id_formulario)}
            disabled={cargando}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            {cargando ? (
              <span className="animate-spin w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

function BloquePanel({ titulo, turno, alumnos, isDark }) {
  const cardCls = isDark ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const badgeColor = turno === 'Vespertino'
    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

  return (
    <div className={`${cardCls} rounded-2xl p-5 border`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {titulo}
        </h3>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeColor}`}>
          {alumnos.length} Alumno{alumnos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {alumnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium">Sin alumnos asignados</p>
          <p className="text-xs mt-0.5">Los alumnos aceptados aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alumnos.map((alumno) => (
            <div
              key={alumno.id_formulario}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                {alumno.nombre_completo.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {alumno.nombre_completo}
                </p>
                <p className="text-xs text-slate-500 font-mono">{alumno.matricula}</p>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                alumno.turno === 'Vespertino'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {alumno.turno === 'Vespertino' ? 'Vesp.' : 'Mat.'}
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
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState({});
  const [error, setError] = useState('');
  const [errorGlobal, setErrorGlobal] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError('');
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        if (mounted) setSolicitudes(data);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [club.id_club]);

  const pendientes = solicitudes.filter((s) => s.status === 'Pendiente');
  const bloqueA = solicitudes.filter((s) => s.status === 'Aceptado' && s.bloque_asignado === 'A');
  const bloqueB = solicitudes.filter((s) => s.status === 'Aceptado' && s.bloque_asignado === 'B');
  const rechazados = solicitudes.filter((s) => s.status === 'Rechazado');

  async function handleEstatus(id, nuevoStatus) {
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Solicitudes de Ingreso
          </h2>
          <p className={`text-sm mt-0.5 ${tema.subtitle}`}>
            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
            {rechazados.length > 0 && ` · ${rechazados.length} rechazada${rechazados.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {errorGlobal && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{errorGlobal}</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {pendientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">No hay postulaciones por revisar</p>
          <p className="text-xs mt-0.5">Las solicitudes de alumnos aparecerán aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendientes.map((solicitud) => (
            <TarjetaSolicitud
              key={solicitud.id_formulario}
              solicitud={solicitud}
              onAceptar={(id) => handleEstatus(id, 'Aceptado')}
              onRechazar={(id) => handleEstatus(id, 'Rechazado')}
              accionando={accionando}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BloquePanel
          titulo="Bloque A — Vespertino"
          turno="Vespertino"
          alumnos={bloqueA}
          isDark={modoOscuro}
        />
        <BloquePanel
          titulo="Bloque B — Matutino"
          turno="Matutino"
          alumnos={bloqueB}
          isDark={modoOscuro}
        />
      </div>
    </div>
  );
}
