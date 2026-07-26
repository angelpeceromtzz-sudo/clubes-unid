/* Dashboard de administración: grid responsiva con KPIs, inscripciones, gráfica, clubes populares y actividad. */
import { TarjetasEstadisticas } from './TarjetasEstadisticas';
import { UltimasInscripciones } from './UltimasInscripciones';
import { GraficaInscripciones } from './GraficaInscripciones';
import { ClubesPopulares } from './ClubesPopulares';
import { ActividadRecienteFeed } from './ActividadRecienteFeed';

export function DashboardAdmin({
  totalAlumnos,
  clubesActivos,
  totalInscripciones,
  solicitudesPendientes,
  cargandoDashboard,
  inscripciones,
  inscripcionesPorMes,
  clubes,
  historial,
  historialLoading,
}) {
  return (
    <div className="space-y-6">
      <TarjetasEstadisticas
        totalAlumnos={totalAlumnos}
        clubesActivos={clubesActivos}
        totalInscripciones={totalInscripciones}
        solicitudesPendientes={solicitudesPendientes}
        cargandoDashboard={cargandoDashboard}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <UltimasInscripciones
            inscripciones={inscripciones}
            cargando={cargandoDashboard}
          />
          <GraficaInscripciones
            datos={inscripcionesPorMes}
            cargando={cargandoDashboard}
          />
        </div>

        {/* Columna secundaria */}
        <div className="space-y-6">
          <ClubesPopulares clubes={clubes} />
          <ActividadRecienteFeed
            historial={historial}
            cargando={historialLoading}
          />
        </div>
      </div>
    </div>
  );
}
