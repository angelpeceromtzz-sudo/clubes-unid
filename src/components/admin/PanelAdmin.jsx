/* Panel de administración: grid responsiva con KPIs, inscripciones, gráfica, clubes populares y actividad. */
import { TarjetasEstadisticas } from './TarjetasEstadisticas';
import { UltimasInscripciones } from './UltimasInscripciones';
import { GraficaInscripciones } from './GraficaInscripciones';
import { ClubesPopulares } from './ClubesPopulares';
import { ActividadRecienteFeed } from './ActividadRecienteFeed';
import { NoticiasRecientes } from './NoticiasRecientes';

export function PanelAdmin({
  totalAlumnos,
  clubesActivos,
  totalInscripciones,
  solicitudesPendientes,
  cargandoPanel,
  inscripciones,
  inscripcionesPorMes,
  postulacionesPorMes,
  clubes,
  historial,
  historialLoading,
  noticias,
  noticiasLoading,
}) {
  return (
    <div className="space-y-6">
      <TarjetasEstadisticas
        totalAlumnos={totalAlumnos}
        clubesActivos={clubesActivos}
        totalInscripciones={totalInscripciones}
        solicitudesPendientes={solicitudesPendientes}
        cargandoPanel={cargandoPanel}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <UltimasInscripciones
            inscripciones={inscripciones}
            cargando={cargandoPanel}
          />
          <GraficaInscripciones
            titulo="Postulaciones por periodo"
            etiqueta="postulaciones"
            datos={postulacionesPorMes}
            cargando={cargandoPanel}
          />
          <GraficaInscripciones
            titulo="Inscripciones activas"
            etiqueta="inscripciones"
            datos={inscripcionesPorMes}
            cargando={cargandoPanel}
          />
        </div>

        {/* Columna secundaria */}
        <div className="space-y-6">
          <ClubesPopulares clubes={clubes} />
          <NoticiasRecientes
            noticias={noticias}
            cargando={noticiasLoading}
          />
          <ActividadRecienteFeed
            historial={historial}
            cargando={historialLoading}
          />
        </div>
      </div>
    </div>
  );
}
