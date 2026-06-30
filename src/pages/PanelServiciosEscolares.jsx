import { usePanelServiciosEscolares } from '../hooks/usePanelServiciosEscolares';
import { BarraLateralServiciosEscolares } from '../components/serviciosEscolares/ServiciosEscolaresSidebar';
import { PestanasMovilServiciosEscolares } from '../components/serviciosEscolares/ServiciosEscolaresMobileTabs';
import { SeccionResumen } from '../components/serviciosEscolares/SeccionResumen';
import { SeccionClubes } from '../components/serviciosEscolares/SeccionClubes';
import { SeccionPadron } from '../components/serviciosEscolares/SeccionPadron';
import { SeccionAsistencia } from '../components/serviciosEscolares/SeccionAsistencia';

export function PanelServiciosEscolares({ tema, modoOscuro }) {
  const d = usePanelServiciosEscolares();
  const esOscuro = modoOscuro;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <BarraLateralServiciosEscolares
        vistaActiva={d.vistaActiva}
        onCambiarVista={d.setVistaActiva}
        tema={tema}
      />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <PestanasMovilServiciosEscolares
          vistaActiva={d.vistaActiva}
          onCambiarVista={d.setVistaActiva}
          isDark={esOscuro}
        />

        <h1 className={`text-2xl font-black tracking-tight mb-6 ${tema.title}`}>Panel de Servicios Escolares</h1>

        {d.error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-sm text-red-400 font-medium">{d.error}</p>
          </div>
        )}

        {d.vistaActiva === 'resumen' && (
          <SeccionResumen stats={d.stats} ocupacionClubes={d.ocupacionClubes} topClubes={d.topClubes} cargando={d.cargando} esOscuro={esOscuro} />
        )}
        {d.vistaActiva === 'clubes' && (
          <SeccionClubes clubesDetalle={d.clubesDetalle} cargando={d.cargando} esOscuro={esOscuro} />
        )}
        {d.vistaActiva === 'padron' && (
          <SeccionPadron
            padron={d.padron}
            filtrosPadron={d.filtrosPadron}
            aplicarFiltrosPadron={d.aplicarFiltrosPadron}
            clubesDetalle={d.clubesDetalle}
            cargando={d.cargando}
            esOscuro={esOscuro}
          />
        )}
        {d.vistaActiva === 'asistencia' && (
          <SeccionAsistencia
            clubesDetalle={d.clubesDetalle}
            clubAsistenciaId={d.clubAsistenciaId}
            seleccionarClubAsistencia={d.seleccionarClubAsistencia}
            asistencia={d.asistencia}
            cargando={d.cargando}
            esOscuro={esOscuro}
          />
        )}
      </main>
    </div>
  );
}
