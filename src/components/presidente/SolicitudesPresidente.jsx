import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ListaSolicitudes } from './ListaSolicitudes';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { Alerta } from '../ui/Alerta';
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
      {error && <Alerta tipo="error" mensaje={error} />}

      <EncabezadoPagina
        titulo="Formularios"
        subtitulo="Evalúa las solicitudes entrantes. Preselecciona o rechaza alumnos."
        accion={totalPreseleccionados > 0 && !vistaPrevia ? (
          <button
            onClick={mostrarVistaPrevia}
            className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            Revisión general completada
          </button>
        ) : undefined}
      />

      {vistaPrevia && (
        <VistaPreviaConvocatorias
          vistaPrevia={vistaPrevia}
          generando={generando}
          onConfirmar={confirmarGenerar}
          onCancelar={() => setVistaPrevia(null)}
        />
      )}

      <ListaSolicitudes titulo="En revisión" solicitudes={enRevision} color="blue" onPreseleccionar={manejarPreseleccionar} onRechazar={manejarRechazar} accionando={accionando} themeTitle={tema.title} />

      {enRevision.length === 0 && !vistaPrevia && (
        <EmptyState icono="file" titulo="No hay solicitudes pendientes" descripcion="Las solicitudes de alumnos en estado En revisión aparecerán aquí" />
      )}

      <ListaSolicitudes titulo="Preseleccionados" solicitudes={preseleccionados} color="purple" onPreseleccionar={manejarPreseleccionar} onRechazar={manejarRechazar} accionando={accionando} themeTitle={tema.title} />
    </div>
  );
}
