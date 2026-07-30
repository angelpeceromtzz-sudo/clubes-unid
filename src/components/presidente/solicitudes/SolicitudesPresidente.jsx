import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';
import { EmptyState } from '../../ui/EmptyState';
import { ListaSolicitudes } from './ListaSolicitudes';
import { EncabezadoPagina } from '../../ui/EncabezadoPagina';
import { Alerta } from '../../ui/Alerta';
import { VistaPreviaConvocatorias } from '../vistas/VistaPreviaConvocatorias';

export function SolicitudesPresidente({ club }) {
  const { tema } = useTheme();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [accionBatch, setAccionBatch] = useState(null);

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

  const enRevision = solicitudes.filter((s) => s.status === 'En revisión');
  const preseleccionados = solicitudes.filter((s) => s.status === 'Preseleccionado');

  function toggleSeleccion(id) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleTodos() {
    const idsEnRevision = enRevision.map((s) => s.id_formulario);
    if (seleccionados.length === idsEnRevision.length && idsEnRevision.length > 0) {
      setSeleccionados([]);
    } else {
      setSeleccionados(idsEnRevision);
    }
  }

  const ejecutarBatch = useCallback(async (nuevoStatus) => {
    setAccionBatch(nuevoStatus);
    setError('');
    try {
      for (const id of seleccionados) {
        await api.actualizarEstatusSolicitud(id, nuevoStatus);
      }
      setSolicitudes((prev) =>
        prev.map((s) =>
          seleccionados.includes(s.id_formulario) ? { ...s, status: nuevoStatus } : s
        )
      );
      setSeleccionados([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccionBatch(null);
    }
  }, [seleccionados]);

  const preseleccionarSeleccionados = useCallback(
    () => ejecutarBatch('Preseleccionado'),
    [ejecutarBatch]
  );

  const rechazarSeleccionados = useCallback(
    () => ejecutarBatch('Rechazado'),
    [ejecutarBatch]
  );

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

  const todosSeleccionados = seleccionados.length === enRevision.length && enRevision.length > 0;
  const puedeGenerar = preseleccionados.length > 0 && enRevision.length === 0 && !vistaPrevia;

  if (cargando) {
    return <Spinner />;
  }

  return (
    <div className="space-y-8">
      {error && <Alerta tipo="error" mensaje={error} />}

      <EncabezadoPagina
        titulo="Formularios"
        subtitulo="Evalúa las solicitudes entrantes. Preselecciona o rechaza alumnos en lote."
      />

      {enRevision.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={toggleTodos}
              className={`w-5 h-5 rounded border-2 cursor-pointer transition-colors ${
                todosSeleccionados
                  ? 'bg-amber-400 border-amber-400'
                  : tema.isDark ? 'border-slate-600' : 'border-slate-400'
              }`}
            >
              {todosSeleccionados && (
                <svg className="h-full w-full text-[#0e162c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-xs uppercase font-bold tracking-wider ${tema.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </span>
          </label>
          <span className={`text-xs font-medium ${tema.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            ({seleccionados.length} de {enRevision.length} seleccionados)
          </span>

          <div className="flex-1" />

          <button
            onClick={preseleccionarSeleccionados}
            disabled={seleccionados.length === 0 || accionBatch !== null}
            className="border border-purple-500/40 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {accionBatch === 'Preseleccionado' ? (
              <Spinner size="sm" color="border-current" className="!py-0" />
            ) : null}
            Preseleccionar ({seleccionados.length})
          </button>

          <button
            onClick={rechazarSeleccionados}
            disabled={seleccionados.length === 0 || accionBatch !== null}
            className="border border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {accionBatch === 'Rechazado' ? (
              <Spinner size="sm" color="border-current" className="!py-0" />
            ) : null}
            Rechazar ({seleccionados.length})
          </button>
        </div>
      )}

      {puedeGenerar && !vistaPrevia && (
        <div className="flex justify-end">
          <button
            onClick={mostrarVistaPrevia}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            Revisión general completada
          </button>
        </div>
      )}

      {enRevision.length > 0 && !puedeGenerar && !vistaPrevia && (
        <p className={`text-xs text-amber-400 font-medium`}>
          {preseleccionados.length > 0
            ? `Procesa todos los formularios "En revisión" antes de generar las convocatorias (${enRevision.length} pendiente${enRevision.length !== 1 ? 's' : ''})`
            : `Preselecciona o rechaza alumnos para continuar con el proceso`}
        </p>
      )}

      {vistaPrevia && (
        <VistaPreviaConvocatorias
          vistaPrevia={vistaPrevia}
          generando={generando}
          onConfirmar={confirmarGenerar}
          onCancelar={() => setVistaPrevia(null)}
        />
      )}

      <ListaSolicitudes
        titulo="En revisión"
        solicitudes={enRevision}
        color="blue"
        seleccionados={seleccionados}
        onToggleSeleccion={toggleSeleccion}
        themeTitle={tema.title}
      />

      {enRevision.length === 0 && !vistaPrevia && (
        <EmptyState icono="file" titulo="No hay solicitudes pendientes" descripcion="Las solicitudes de alumnos en estado En revisión aparecerán aquí" />
      )}

      <ListaSolicitudes
        titulo="Preseleccionados"
        solicitudes={preseleccionados}
        color="purple"
        seleccionados={seleccionados}
        onToggleSeleccion={toggleSeleccion}
        themeTitle={tema.title}
      />
    </div>
  );
}
