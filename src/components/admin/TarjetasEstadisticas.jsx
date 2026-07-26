/* Tarjetas de resumen con totales de alumnos, clubes activos, inscripciones y solicitudes pendientes. */
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';

const TARJETAS = [
  {
    key: 'alumnos',
    label: 'Total Alumnos',
    icono: 'users',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    accessor: (d) => d.totalAlumnos,
  },
  {
    key: 'clubes',
    label: 'Clubes Activos',
    icono: 'clipboard',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    accessor: (d) => d.clubesActivos,
  },
  {
    key: 'inscripciones',
    label: 'Inscripciones Activas',
    icono: 'check-circle',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    accessor: (d) => d.totalInscripciones,
  },
  {
    key: 'solicitudes',
    label: 'Solicitudes Pendientes',
    icono: 'bell',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    accessor: (d) => d.solicitudesPendientes,
  },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-2.5 w-24 rounded-full bg-slate-700/40" />
          <div className="h-8 w-14 rounded-lg bg-slate-700/40" />
        </div>
        <div className="h-10 w-10 rounded-full bg-slate-700/40" />
      </div>
    </div>
  );
}

export function TarjetasEstadisticas({ totalAlumnos, clubesActivos, totalInscripciones, solicitudesPendientes, cargandoDashboard }) {
  const { cardCls, tema } = useTheme();

  const datos = { totalAlumnos, clubesActivos, totalInscripciones, solicitudesPendientes };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {TARJETAS.map((t) => {
        const valor = t.accessor(datos);
        const cargando = cargandoDashboard && t.key === 'solicitudes';

        return (
          <div key={t.key} className={`${cardCls} border rounded-2xl p-5 md:p-6 transition-all duration-200 hover:shadow-lg hover:shadow-amber-400/5`}>
            {cargando ? (
              <SkeletonCard />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 truncate">
                    {t.label}
                  </p>
                  <p className={`text-3xl md:text-4xl font-black tabular-nums ${tema.title}`}>
                    {valor ?? '—'}
                  </p>
                </div>
                <div className={`shrink-0 flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-full ${t.iconBg}`}>
                  <Icono nombre={t.icono} strokeWidth={2} className={`h-5 w-5 ${t.iconColor}`} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
