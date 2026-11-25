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
import { SelectorPeriodoAsistencia } from './SelectorPeriodoAsistencia';

const SUB_VISTAS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'historial', label: 'Historial' },
  { key: 'estadisticas', label: 'Estadísticas' },
];
const MENSAJE_SIN_PERIODO = 'Aún no hay fechas establecidas para registrar asistencias. Cuando Coordinación las configure, podrás marcar la asistencia de tus sesiones.';

async function consultarSesionesDeHoy() {
  const periodoActivo = await api.getAsistenciaPeriodoActivo();
  if (!periodoActivo) return { sesiones: [], sinPeriodo: true };
  return { sesiones: await api.getAsistenciaSesionesHoy(), sinPeriodo: false };
}

export function VistaAsistencia({ club }) {
  const { modoOscuro } = useTheme();
  const [subVista, setSubVista] = useState('hoy');
  const [sesionesHoy, setSesionesHoy] = useState([]);
  const [cargandoHoy, setCargandoHoy] = useState(true);
  const [errorHoy, setErrorHoy] = useState('');
  const [sinPeriodoActivo, setSinPeriodoActivo] = useState(false);
  const [sesionAbierta, setSesionAbierta] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [cargandoCancelar, setCargandoCancelar] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [periodosListos, setPeriodosListos] = useState(false);
  const [idPeriodoSel, setIdPeriodoSel] = useState('');

  // Carga inicial (sin setState síncrono en el effect: el estado de carga parte en true)
  useEffect(() => {
    let montado = true;
    (async () => {
      try {
        const resultado = await consultarSesionesDeHoy();
        if (montado) {
          setSesionesHoy(resultado.sesiones);
          setSinPeriodoActivo(resultado.sinPeriodo);
          setErrorHoy(resultado.sinPeriodo ? MENSAJE_SIN_PERIODO : '');
        }
      } catch (err) {
        if (montado) {
          setSinPeriodoActivo(false);
          setErrorHoy(err.message);
        }
      } finally {
        if (montado) setCargandoHoy(false);
      }
    })();
    return () => { montado = false; };
  }, []);

  // Catálogo de periodos para el selector de cuatrimestre (§5)
  useEffect(() => {
    let montado = true;
    api.getAsistenciaPeriodos()
      .then((data) => { if (montado) setPeriodos(data); })
      .catch(() => { /* la vista conserva el aviso si no se pudo consultar el catálogo */ })
      .finally(() => { if (montado) setPeriodosListos(true); });
    return () => { montado = false; };
  }, []);

  // Recarga manual (desde handlers de eventos: volver de la toma, cancelar sesión)
  async function recargarHoy() {
    setCargandoHoy(true);
    setErrorHoy('');
    setSinPeriodoActivo(false);
    try {
      const resultado = await consultarSesionesDeHoy();
      setSesionesHoy(resultado.sesiones);
      setSinPeriodoActivo(resultado.sinPeriodo);
      if (resultado.sinPeriodo) setErrorHoy(MENSAJE_SIN_PERIODO);
    } catch (err) {
      setSinPeriodoActivo(false);
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
      setSinPeriodoActivo(false);
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
            <Alerta tipo={sinPeriodoActivo ? 'warning' : 'error'} mensaje={errorHoy} className="mb-4" />
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

      {subVista === 'historial' && (
        <>
          <SelectorPeriodoAsistencia
            periodos={periodos}
            valor={idPeriodoSel}
            onChange={setIdPeriodoSel}
          />
          <HistorialAsistencia idPeriodo={idPeriodoSel || undefined} />
        </>
      )}
      {subVista === 'estadisticas' && (
        <>
          <SelectorPeriodoAsistencia
            periodos={periodos}
            valor={idPeriodoSel}
            onChange={setIdPeriodoSel}
          />
          <EstadisticasAsistencia
            idPeriodo={idPeriodoSel || undefined}
            periodos={periodos}
            periodosListos={periodosListos}
          />
        </>
      )}

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
