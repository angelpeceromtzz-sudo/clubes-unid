/* Estadísticas de asistencia del club (PBI-05 §25–§29) — Mobile First.
   Indicadores del periodo, tarjetas de integrantes ordenadas por porcentaje y detalle individual.
   Props opcionales idClub/idPeriodo: idClub activa el modo Coordinación (§27). */
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { Badge } from '../ui/Badge';
import { Alerta } from '../ui/Alerta';
import { Spinner } from '../ui/Spinner';
import { TarjetaStat } from '../ui/TarjetaStat';
import { colorPorcentaje } from './constantesAsistencia';

export function EstadisticasAsistencia({ idClub, idPeriodo } = {}) {
  const { modoOscuro, tema } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [integranteSel, setIntegranteSel] = useState(null);

  useEffect(() => {
    let montado = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = idClub
          ? await api.getAsistenciaEstadisticasClubPor(idClub, idPeriodo)
          : await api.getAsistenciaEstadisticasClub(idPeriodo);
        if (montado) setStats(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setLoading(false);
      }
    })();
    return () => { montado = false; };
  }, [idClub, idPeriodo]);

  if (loading) return <Spinner className="py-16" />;
  if (error) return <Alerta tipo="error" mensaje={error} />;
  if (!stats) return null;

  const { periodo, sesiones, totales, indicadores, integrantes } = stats;
  const hayDatos = integrantes.length > 0;

  return (
    <div>
      {periodo && (
        <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${tema.subtitle}`}>
          Periodo: {periodo.nombre}
        </p>
      )}

      {/* Indicadores administrativos (§28) */}
      <div className="space-y-2 mb-5">
        {indicadores.integrantes_con_baja_asistencia > 0 && (
          <Alerta tipo="warning">
            {indicadores.integrantes_con_baja_asistencia} integrante(s) con baja asistencia
            (menos del {indicadores.umbral_baja_asistencia}%).
          </Alerta>
        )}
        {indicadores.integrantes_con_3_o_mas_ausencias_consecutivas > 0 && (
          <Alerta tipo="warning">
            {indicadores.integrantes_con_3_o_mas_ausencias_consecutivas} integrante(s) con 3 o más
            ausencias consecutivas.
          </Alerta>
        )}
        {indicadores.sesiones_no_registradas > 0 && (
          <Alerta tipo="info">
            {indicadores.sesiones_no_registradas} sesión(es) no registradas durante el periodo.
          </Alerta>
        )}
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <TarjetaStat
          titulo="Asistencia promedio"
          valor={stats.asistencia_promedio !== null ? `${stats.asistencia_promedio}%` : '—'}
          icono="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h3m-3 4h3m-6-4h.01M9 16h.01"
          color="bg-amber-500/10 border border-amber-500/20"
        />
        <TarjetaStat
          titulo="Presentes"
          valor={totales.presentes}
          icono="M5 13l4 4L19 7"
          color="bg-emerald-500/10 border border-emerald-500/20"
        />
        <TarjetaStat
          titulo="Ausentes"
          valor={totales.ausentes}
          icono="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="bg-red-500/10 border border-red-500/20"
        />
        <TarjetaStat
          titulo="Justificadas"
          valor={totales.justificadas}
          icono="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="bg-blue-500/10 border border-blue-500/20"
        />
      </div>

      {/* Resumen de sesiones del periodo */}
      <div className={`rounded-2xl border p-5 mb-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <p className={`text-sm font-black uppercase tracking-wider mb-3 ${tema.title}`}>
          Sesiones del periodo ({sesiones.total})
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Completadas', valor: sesiones.completada, color: 'text-emerald-400' },
            { label: 'Canceladas', valor: sesiones.cancelada, color: 'text-red-400' },
            { label: 'No registradas', valor: sesiones.no_registrada, color: 'text-slate-400' },
            { label: 'No completadas', valor: sesiones.no_completada, color: 'text-yellow-400' },
            { label: 'Pendientes', valor: sesiones.pendiente, color: 'text-blue-400' },
            { label: 'En progreso', valor: sesiones.en_progreso, color: 'text-indigo-400' },
          ].map((f) => (
            <div key={f.label}>
              <p className={`text-xs ${tema.subtitle}`}>{f.label}</p>
              <p className={`text-lg font-black ${f.color}`}>{f.valor ?? 0}</p>
            </div>
          ))}
        </div>
        <p className={`text-[11px] mt-3 ${tema.subtitle}`}>
          Las justificadas no perjudican el porcentaje: Presentes ÷ (Presentes + Ausentes) × 100.
          Sesiones canceladas, no registradas y no completadas no generan ausencias.
        </p>
      </div>

      {/* Lista de integrantes (§26.3) */}
      <p className={`text-sm font-black uppercase tracking-wider mb-3 ${tema.title}`}>
        Integrantes ({integrantes.length})
      </p>

      {!hayDatos && (
        <div className={`rounded-2xl border p-8 text-center ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
          <Icono nombre="info" className={`h-8 w-8 mx-auto mb-3 ${tema.iconColor}`} strokeWidth={1.5} />
          <p className={`text-sm ${tema.subtitle}`}>
            Aún no hay sesiones completadas en este periodo, por lo que no hay estadísticas por integrante.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {integrantes.map((integ) => (
          <button
            key={integ.id_usuario}
            onClick={() => setIntegranteSel(integ)}
            className={`w-full text-left rounded-2xl border p-4 cursor-pointer transition-all active:scale-[0.99] ${
              modoOscuro ? 'bg-[#0e162c] border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-bold ${tema.title}`}>{integ.nombre_completo}</p>
                <p className={`text-xs mt-0.5 ${tema.subtitle}`}>
                  {integ.presentes} P · {integ.ausentes} A · {integ.justificadas} J
                  {integ.ausencias_consecutivas > 0 ? ` · ${integ.ausencias_consecutivas} ausencia(s) seguida(s)` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xl font-black ${colorPorcentaje(integ.porcentaje)}`}>
                  {integ.porcentaje !== null ? `${integ.porcentaje}%` : '—'}
                </p>
                {integ.porcentaje !== null && integ.porcentaje < indicadores.umbral_baja_asistencia && (
                  <Badge texto="Baja asistencia" color="red" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal detalle individual (§26.3) */}
      {integranteSel && (
        <ModalDetalleIntegrante
          integrante={integranteSel}
          periodo={periodo}
          umbral={indicadores.umbral_baja_asistencia}
          idClub={idClub}
          idPeriodo={idPeriodo}
          onCerrar={() => setIntegranteSel(null)}
        />
      )}
    </div>
  );
}

/* Detalle individual según el ejemplo del PBI §26.3. */
function ModalDetalleIntegrante({ integrante, periodo, umbral, idClub, idPeriodo, onCerrar }) {
  const { modoOscuro, tema } = useTheme();
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const idIntegrante = integrante.id_usuario;

  useEffect(() => {
    let montado = true;
    (async () => {
      try {
        const data = idClub
          ? await api.getAsistenciaEstadisticasIntegrantePor(idClub, idIntegrante, idPeriodo)
          : await api.getAsistenciaEstadisticasIntegrante(idIntegrante, idPeriodo);
        if (montado) setDetalle(data);
      } catch {
        // sin detalle adicional; se muestran los datos del padre
      } finally {
        if (montado) setLoading(false);
      }
    })();
    return () => { montado = false; };
  }, [idClub, idIntegrante, idPeriodo]);

  const porcentaje = detalle?.porcentaje ?? integrante.porcentaje;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div
        className={`rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 border max-h-[90vh] overflow-y-auto ${
          modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className={`text-base font-black ${tema.title}`}>{integrante.nombre_completo}</h3>
          <button onClick={onCerrar} className={`p-1 cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500'}`} aria-label="Cerrar">
            <Icono nombre="close" className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {loading ? (
          <Spinner className="py-8" />
        ) : (
          <>
            <div className="text-center mb-5">
              <p className={`text-5xl font-black ${colorPorcentaje(porcentaje)}`}>
                {porcentaje !== null ? `${porcentaje}%` : '—'}
              </p>
              <p className={`text-xs mt-1 ${tema.subtitle}`}>Asistencia del periodo</p>
              {porcentaje !== null && porcentaje < umbral && (
                <div className="mt-2 flex justify-center">
                  <Badge texto="Baja asistencia" color="red" size="md" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Presentes', valor: integrante.presentes, color: 'text-emerald-400' },
                { label: 'Ausentes', valor: integrante.ausentes, color: 'text-red-400' },
                { label: 'Justificadas', valor: integrante.justificadas, color: 'text-amber-400' },
              ].map((f) => (
                <div key={f.label} className={`rounded-xl border p-3 text-center ${modoOscuro ? 'border-slate-700/50 bg-[#18223f]/40' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-xl font-black ${f.color}`}>{f.valor}</p>
                  <p className={`text-[10px] uppercase font-bold ${tema.subtitle}`}>{f.label}</p>
                </div>
              ))}
            </div>

            <p className={`text-xs ${tema.subtitle} mb-1`}>
              Ausencias consecutivas: <strong className={integrante.ausencias_consecutivas >= 3 ? 'text-red-400' : ''}>{integrante.ausencias_consecutivas}</strong>
            </p>
            {periodo && (
              <p className={`text-xs ${tema.subtitle}`}>Periodo: {periodo.nombre}</p>
            )}
            <p className={`text-[11px] mt-3 ${tema.subtitle}`}>
              Las estadísticas son información de apoyo; las decisiones corresponden al responsable del club.
            </p>
          </>
        )}

        <button
          onClick={onCerrar}
          className={`w-full mt-5 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wider border transition-all cursor-pointer ${
            modoOscuro ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
