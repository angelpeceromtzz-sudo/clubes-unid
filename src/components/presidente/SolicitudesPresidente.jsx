import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorAlerta } from '../ui/ErrorAlerta';
import { TarjetaSolicitud } from './TarjetaSolicitud';
import { VistaPreviaConvocatorias } from './VistaPreviaConvocatorias';

export function SolicitudesPresidente({ club }) {
  const { tema } = useTheme();
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
    return <Spinner />;
  }

  return (
    <div className="space-y-8">
      <ErrorAlerta mensaje={error} />

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
        <VistaPreviaConvocatorias
          vistaPrevia={vistaPrevia}
          generando={generando}
          onConfirmar={confirmarGenerar}
          onCancelar={() => setVistaPrevia(null)}
        />
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
        <EmptyState icono="file" titulo="No hay solicitudes pendientes" descripcion="Las solicitudes de alumnos en estado En revisión aparecerán aquí" />
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
