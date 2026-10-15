/* Vista raíz del módulo de Asistencia para el presidente (PBI-05 §26) — Mobile First.
   Sub-tabs: Hoy / Historial / Estadísticas. La toma de lista abre a pantalla completa. */
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { ListaSesionesHoy } from './ListaSesionesHoy';
import { TomaAsistencia } from './TomaAsistencia';
import { ModalCancelarSesion } from './ModalCancelarSesion';
import { HistorialAsistencia } from './HistorialAsistencia';
import { EstadisticasAsistencia } from './EstadisticasAsistencia';

const SUB_VISTAS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'historial', label: 'Historial' },
  { key: 'estadisticas', label: 'Estadísticas' },
];

export function VistaAsistencia({ club }) {
  const { modoOscuro } = useTheme();
  const [subVista, setSubVista] = useState('hoy');
  const [sesionesHoy, setSesionesHoy] = useState([]);
  const [cargandoHoy, setCargandoHoy] = useState(true);
  const [errorHoy, setErrorHoy] = useState('');
  const [sesionAbierta, setSesionAbierta] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [cargandoCancelar, setCargandoCancelar] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState('');

  // Carga inicial (sin setState síncrono en el effect: el estado de carga parte en true)
  useEffect(() => {
    let montado = true;
    (async () => {
      try {
        const data = await api.getAsistenciaSesionesHoy();
        if (montado) setSesionesHoy(data);
      } catch (err) {
        if (montado) setErrorHoy(err.message);
      } finally {
        if (montado) setCargandoHoy(false);
      }
    })();
    return () => { montado = false; };
  }, []);

  // Recarga manual (desde handlers de eventos: volver de la toma, cancelar sesión)
  async function recargarHoy() {
    setCargandoHoy(true);
    setErrorHoy('');
    try {
      const data = await api.getAsistenciaSesionesHoy();
      setSesionesHoy(data);
    } catch (err) {
      setErrorHoy(err.message);
    } finally {
      setCargandoHoy(false);
    }
  }

  async function abrirSesion(sesion) {
    try {
      const detalle = await api.getAsistenciaSesion(sesion.id_sesion);
      setSesionAbierta(detalle);
    } catch (err) {
      setErrorHoy(err.message);
    }
  }

  async function confirmarCancelar(motivo, observacion) {
    setCargandoCancelar(true);
    setErrorCancelar('');
    try {
      await api.cancelarSesionAsistencia(modalCancelar.id_sesion, motivo, observacion);
      setModalCancelar(null);
      await recargarHoy();
    } catch (err) {
      setErrorCancelar(err.message);
    } finally {
      setCargandoCancelar(false);
    }
  }

  // Toma de lista a pantalla completa
  if (sesionAbierta) {
    return (
      <TomaAsistencia
        key={sesionAbierta.id_sesion}
        sesion={sesionAbierta}
        onVolver={() => {
          setSesionAbierta(null);
          recargarHoy();
        }}
        onActualizarSesion={(cambios) =>
          setSesionAbierta((prev) => (prev ? { ...prev, ...cambios } : prev))
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Sub-tabs (píldoras horizontales con scroll en móvil) */}
      <div
        className={`flex gap-1 p-1 rounded-full mb-6 overflow-x-auto ${modoOscuro ? 'bg-[#18223f]/60 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {SUB_VISTAS.map((sv) => (
          <button
            key={sv.key}
            onClick={() => setSubVista(sv.key)}
            className={`flex-1 text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-full whitespace-nowrap cursor-pointer transition-all ${
              subVista === sv.key
                ? 'bg-amber-400/20 text-amber-400'
                : modoOscuro
                  ? 'text-slate-400'
                  : 'text-slate-500'
            }`}
          >
            {sv.label}
          </button>
        ))}
      </div>

      {subVista === 'hoy' && (
        <>
          {errorHoy && (
            <Alerta tipo="error" mensaje={errorHoy} className="mb-4" />
          )}
          {cargandoHoy ? (
            <Spinner className="py-16" />
          ) : (
            <ListaSesionesHoy
              sesiones={sesionesHoy}
              club={club}
              onTomarAsistencia={abrirSesion}
              onCancelarSesion={(s) => {
                setErrorCancelar('');
                setModalCancelar(s);
              }}
            />
          )}
        </>
      )}

      {subVista === 'historial' && <HistorialAsistencia />}
      {subVista === 'estadisticas' && <EstadisticasAsistencia />}

      <ModalCancelarSesion
        show={!!modalCancelar}
        sesion={modalCancelar}
        onConfirmar={confirmarCancelar}
        onCancelar={() => setModalCancelar(null)}
        cargando={cargandoCancelar}
        error={errorCancelar}
      />
    </div>
  );
}
