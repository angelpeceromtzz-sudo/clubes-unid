import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Icono } from './ui/Icono';

const COLORES_ESTATUS = {
  'En revisión': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Preseleccionado': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Rechazado': 'bg-red-500/20 text-red-400 border-red-500/30',
};

function TarjetaSolicitud({ solicitud, onPreseleccionar, onRechazar, accionando }) {
  const cargando = accionando[solicitud.id_formulario];
  const estatusActual = solicitud.status;
  const colorEstatus = COLORES_ESTATUS[estatusActual] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  const [motivoAbierto, setMotivoAbierto] = useState(false);

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
              {solicitud.experiencia_previa && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-2 mb-1">Experiencia previa</p>
                  <p className="text-slate-400 text-sm">{solicitud.experiencia_previa}</p>
                </>
              )}
            </div>
          )}
        </div>

        {estatusActual === 'En revisión' && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onPreseleccionar(solicitud.id_formulario)}
              disabled={cargando}
              className="border border-purple-500/40 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {cargando ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Icono nombre="check-circle" strokeWidth={2} className="h-3.5 w-3.5" />
              )}
              Preseleccionar
            </button>
            <button
              onClick={() => onRechazar(solicitud.id_formulario)}
              disabled={cargando}
              className="border border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {cargando ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Icono nombre="close" strokeWidth={2} className="h-3.5 w-3.5" />
              )}
              Rechazar
            </button>
          </div>
        )}
        {estatusActual !== 'En revisión' && (
          <div className="shrink-0">
            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${colorEstatus}`}>
              {estatusActual}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SolicitudesPresidente({ club, tema, modoOscuro }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState({});
  const [error, setError] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [generando, setGenerando] = useState(false);

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

  async function manejarPreseleccionar(id) {
    setAccionando((prev) => ({ ...prev, [id]: true }));
    setError('');
    try {
      await api.actualizarEstatusSolicitud(id, 'Preseleccionado');
      setSolicitudes((prev) =>
        prev.map((s) => (s.id_formulario === id ? { ...s, status: 'Preseleccionado' } : s))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setAccionando((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function manejarRechazar(id) {
    setAccionando((prev) => ({ ...prev, [id]: true }));
    setError('');
    try {
      await api.actualizarEstatusSolicitud(id, 'Rechazado');
      setSolicitudes((prev) =>
        prev.map((s) => (s.id_formulario === id ? { ...s, status: 'Rechazado' } : s))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setAccionando((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function mostrarVistaPrevia() {
    setVistaPrevia(null);
    setError('');
    try {
      const data = await api.getVistaPrevia(club.id_club);
      setVistaPrevia(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmarGenerar() {
    setGenerando(true);
    setError('');
    try {
      await api.generarConvocatorias(club.id_club);
      setVistaPrevia(null);
      setSolicitudes((prev) =>
        prev.map((s) => s.status === 'Preseleccionado' ? { ...s, status: 'Convocado' } : s)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  const enRevision = solicitudes.filter((s) => s.status === 'En revisión');
  const preseleccionados = solicitudes.filter((s) => s.status === 'Preseleccionado');
  const totalPreseleccionados = preseleccionados.length;

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>
            Formularios
          </h2>
          <p className={`text-sm ${tema.subtitle}`}>
            Evalúa las solicitudes entrantes. Preselecciona o rechaza alumnos.
          </p>
        </div>
        {totalPreseleccionados > 0 && !vistaPrevia && (
          <button
            onClick={mostrarVistaPrevia}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            Revisión general completada
          </button>
        )}
      </div>

      {vistaPrevia && (
        <div className={`rounded-2xl p-6 border ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Icono nombre="check-circle" strokeWidth={2} className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`text-base font-black uppercase tracking-wider ${tema.title}`}>
                Vista previa de convocatorias
              </h3>
              <p className={`text-sm ${tema.subtitle}`}>
                Has preseleccionado <strong>{vistaPrevia.total}</strong> alumno{vistaPrevia.total !== 1 ? 's' : ''}.
                El sistema generará automáticamente:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {vistaPrevia.bloques.map((b) => (
              <div key={b.bloque} className="bg-[#18223f] rounded-xl p-4 border border-slate-700/50 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Bloque {b.bloque}</p>
                <p className="text-2xl font-black text-amber-400">{b.alumnos}</p>
                <p className="text-xs text-slate-500">alumno{b.alumnos !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>

          <p className={`text-xs mb-4 ${tema.subtitle}`}>
            * Los bloques se asignan por fecha de envío del formulario. No es posible modificar la distribución manualmente.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setVistaPrevia(null)}
              disabled={generando}
              className={`flex-1 border rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 ${
                modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={confirmarGenerar}
              disabled={generando}
              className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {generando ? (
                <span className="animate-spin w-4 h-4 border-2 border-[#0e162c] border-t-transparent rounded-full" />
              ) : (
                'Confirmar y Generar Convocatorias'
              )}
            </button>
          </div>
        </div>
      )}

      {enRevision.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
              En revisión
            </h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
              {enRevision.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enRevision.map((s, i) => {
              const cardKey = s.id_formulario ?? `sol-${i}`;
              return (
                <TarjetaSolicitud
                  key={cardKey}
                  solicitud={s}
                  onPreseleccionar={manejarPreseleccionar}
                  onRechazar={manejarRechazar}
                  accionando={accionando}
                />
              );
            })}
          </div>
        </div>
      )}

      {enRevision.length === 0 && !vistaPrevia && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Icono nombre="file" strokeWidth={1.5} className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No hay solicitudes pendientes</p>
          <p className="text-xs mt-0.5">Las solicitudes de alumnos en estado 'En revisión' aparecerán aquí</p>
        </div>
      )}

      {preseleccionados.length > 0 && !vistaPrevia && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
              Preseleccionados
            </h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
              {preseleccionados.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preseleccionados.map((s, i) => {
              const cardKey = s.id_formulario ?? `presel-${i}`;
              return (
                <TarjetaSolicitud
                  key={cardKey}
                  solicitud={s}
                  onPreseleccionar={manejarPreseleccionar}
                  onRechazar={manejarRechazar}
                  accionando={accionando}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
