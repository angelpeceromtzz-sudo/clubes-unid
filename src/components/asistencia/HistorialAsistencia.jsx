/* Historial de sesiones del club (PBI-05 §26.2) — Mobile First.
   Lista apilada con filtros por estado y detalle en modal (solo lectura, §15). */
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { fechaCorta, rangoHoras, horaDesdeTimestamp } from '../../utils/fechas';
import { ESTADOS_SESION } from './constantesAsistencia';

const FILTROS = [
  { key: '', label: 'Todas' },
  { key: 'completada', label: 'Completadas' },
  { key: 'cancelada', label: 'Canceladas' },
  { key: 'no_registrada', label: 'No registradas' },
  { key: 'no_completada', label: 'No completadas' },
];

export function HistorialAsistencia() {
  const { modoOscuro, tema } = useTheme();
  const [sesiones, setSesiones] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sesionDetalle, setSesionDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    let montado = true;
    (async () => {
      try {
        const data = await api.getAsistenciaHistorial({ limit: 200 });
        if (montado) setSesiones(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setLoading(false);
      }
    })();
    return () => { montado = false; };
  }, []);

  async function abrirDetalle(sesion) {
    setCargandoDetalle(true);
    try {
      const detalle = await api.getAsistenciaSesion(sesion.id_sesion);
      setSesionDetalle(detalle);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoDetalle(false);
    }
  }

  const visibles = filtro ? sesiones.filter((s) => s.estado === filtro) : sesiones;

  if (loading) return <Spinner className="py-16" />;

  return (
    <div>
      {/* Filtros horizontales (scroll en móvil) */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
              filtro === f.key
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                : modoOscuro
                  ? 'text-slate-400 border border-slate-700 hover:border-slate-600'
                  : 'text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <Alerta tipo="error" mensaje={error} className="mb-4" />}

      {visibles.length === 0 && !error && (
        <div className={`rounded-2xl border p-8 text-center ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <p className={`text-sm font-bold ${tema.title}`}>Sin sesiones</p>
          <p className={`text-xs mt-1 ${tema.subtitle}`}>
            Aún no hay sesiones registradas en este periodo.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibles.map((sesion) => {
          const info = ESTADOS_SESION[sesion.estado] || ESTADOS_SESION.pendiente;
          const registradas = parseInt(sesion.registradas, 10) || 0;
          const total = parseInt(sesion.total_integrantes, 10) || 0;

          return (
            <button
              key={sesion.id_sesion}
              onClick={() => abrirDetalle(sesion)}
              disabled={cargandoDetalle}
              className={`w-full text-left rounded-2xl border p-4 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60 ${
                modoOscuro ? 'bg-[#0e162c] border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm font-black ${tema.title}`}>{fechaCorta(sesion.fecha)}</p>
                  <p className={`text-xs mt-0.5 ${tema.subtitle}`}>
                    {rangoHoras(sesion.hora_inicio, sesion.hora_fin)}
                    {sesion.lugar ? ` · ${sesion.lugar}` : ''}
                  </p>
                  {sesion.estado === 'completada' && (
                    <p className="text-xs text-emerald-400 mt-1 font-semibold">
                      {registradas}/{total} registrados
                    </p>
                  )}
                  {sesion.estado === 'cancelada' && sesion.motivo_cancelacion && (
                    <p className="text-xs text-red-400 mt-1">
                      Motivo: {sesion.motivo_cancelacion}
                    </p>
                  )}
                  {(sesion.estado === 'no_registrada' || sesion.estado === 'no_completada') && (
                    <p className="text-xs text-slate-400 mt-1">
                      {registradas > 0 ? `${registradas}/${total} registros parciales` : 'Sin registros de asistencia'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge texto={info.label} color={info.color} />
                  <Icono nombre="chevron-right" className={`h-4 w-4 ${tema.iconColor}`} strokeWidth={2} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal detalle (solo lectura) */}
      {sesionDetalle && (
        <ModalDetalleSesion sesion={sesionDetalle} onCerrar={() => setSesionDetalle(null)} />
      )}
    </div>
  );
}

/* Detalle de sesión histórica: integrantes con su estado y trazabilidad (§16). */
function ModalDetalleSesion({ sesion, onCerrar }) {
  const { modoOscuro, tema } = useTheme();
  const info = ESTADOS_SESION[sesion.estado] || ESTADOS_SESION.pendiente;
  const registrados = sesion.integrantes.filter((i) => i.estado_asistencia);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div
        className={`rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 border max-h-[90vh] overflow-y-auto ${
          modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-black ${tema.title}`}>{fechaCorta(sesion.fecha)}</h3>
              <Badge texto={info.label} color={info.color} size="md" />
            </div>
            <p className={`text-xs mt-1 ${tema.subtitle}`}>
              {rangoHoras(sesion.hora_inicio, sesion.hora_fin)}
              {sesion.lugar ? ` · ${sesion.lugar}` : ''}
            </p>
          </div>
          <button onClick={onCerrar} className={`p-1 cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500'}`} aria-label="Cerrar">
            <Icono nombre="close" className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {sesion.iniciada_en && (
          <p className={`text-xs mb-1 ${tema.subtitle}`}>
            Iniciada: {horaDesdeTimestamp(sesion.iniciada_en)}
            {sesion.finalizada_en ? ` · Finalizada: ${horaDesdeTimestamp(sesion.finalizada_en)}` : ''}
          </p>
        )}
        {sesion.estado === 'cancelada' && (
          <p className="text-xs text-red-400 mb-3">
            Cancelada{sesion.motivo_cancelacion ? ` · ${sesion.motivo_cancelacion}` : ''}
            {sesion.observacion_cancelacion ? ` — ${sesion.observacion_cancelacion}` : ''}
          </p>
        )}

        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${tema.subtitle}`}>
          Integrantes ({registrados.length}/{sesion.total_integrantes} registrados)
        </p>
        <div className="space-y-2">
          {sesion.integrantes.map((i) => {
            const est = i.estado_asistencia;
            const color = est === 'presente' ? 'emerald' : est === 'ausente' ? 'red' : est === 'justificado' ? 'amber' : 'slate';
            const label = est === 'presente' ? 'Presente' : est === 'ausente' ? 'Ausente' : est === 'justificado' ? 'Justificado' : 'Sin registro';
            return (
              <div
                key={i.id_usuario}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-2 ${
                  modoOscuro ? 'border-slate-700/50 bg-[#18223f]/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${tema.title}`}>{i.nombre_completo}</p>
                  {i.motivo_justificacion && (
                    <p className="text-xs text-amber-400 mt-0.5">{i.motivo_justificacion}</p>
                  )}
                </div>
                <Badge texto={label} color={color} />
              </div>
            );
          })}
        </div>

        <BotonVolver onClick={onCerrar} />
      </div>
    </div>
  );
}

function BotonVolver({ onClick }) {
  const { modoOscuro } = useTheme();
  return (
    <button
      onClick={onClick}
      className={`w-full mt-5 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider border transition-all cursor-pointer ${
        modoOscuro
          ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
          : 'border-slate-300 text-slate-700 hover:bg-slate-100'
      }`}
    >
      Cerrar
    </button>
  );
}
