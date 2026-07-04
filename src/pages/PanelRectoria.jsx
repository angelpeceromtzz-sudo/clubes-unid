import { useTheme } from '../contexts/ThemeContext';
import { usePanelRectoria } from '../hooks/usePanelRectoria';
import { BarraLateralRectoria } from '../components/rectoria/RectoriaSidebar';
import { PestanasMovilRectoria } from '../components/rectoria/RectoriaMobileTabs';
import { SeccionResumen } from '../components/rectoria/SeccionResumen';
import { SeccionClubes } from '../components/rectoria/SeccionClubes';
import { SeccionPadron } from '../components/rectoria/SeccionPadron';
import { SeccionAsistencia } from '../components/rectoria/SeccionAsistencia';

export function PanelRectoria() {
  const { tema, esOscuro } = useTheme();
  const d = usePanelRectoria();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <BarraLateralRectoria
        vistaActiva={d.vistaActiva}
        onCambiarVista={d.setVistaActiva}
      />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <PestanasMovilRectoria
          vistaActiva={d.vistaActiva}
          onCambiarVista={d.setVistaActiva}
        />

        <h1 className={`text-2xl font-black tracking-tight mb-6 ${tema.title}`}>Panel de Rectoría</h1>

        {d.error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-sm text-red-400 font-medium">{d.error}</p>
          </div>
        )}

        {d.vistaActiva === 'resumen' && (
          <SeccionResumen stats={d.stats} ocupacionClubes={d.ocupacionClubes} topClubes={d.topClubes} cargando={d.cargando} />
        )}
        {d.vistaActiva === 'clubes' && (
          <SeccionClubes clubesDetalle={d.clubesDetalle} cargando={d.cargando} />
        )}
        {d.vistaActiva === 'padron' && (
          <SeccionPadron
            padron={d.padron}
            filtrosPadron={d.filtrosPadron}
            aplicarFiltrosPadron={d.aplicarFiltrosPadron}
            clubesDetalle={d.clubesDetalle}
            cargando={d.cargando}
          />
        )}
        {d.vistaActiva === 'asistencia' && (
          <SeccionAsistencia
            clubesDetalle={d.clubesDetalle}
            clubAsistenciaId={d.clubAsistenciaId}
            seleccionarClubAsistencia={d.seleccionarClubAsistencia}
            asistencia={d.asistencia}
            cargando={d.cargando}
          />
        )}
      </main>
    </div>
  );
}
