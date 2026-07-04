import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { FormularioNotificacion } from '../components/formularios/FormularioNotificacion';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { SeccionAvisos } from '../components/presidente/SeccionAvisos';
import { SeccionMiembros } from '../components/presidente/SeccionMiembros';
import { usePanelPresidente } from '../hooks/usePanelPresidente';
import { BarraLateralPresidente } from '../components/presidente/PresidenteSidebar';
import { PestanasMovilPresidente } from '../components/presidente/PresidenteMobileTabs';
import { EstadoVacio } from '../components/presidente/EmptyState';
import { SolicitudesPresidente } from '../components/presidente/SolicitudesPresidente';
import { SeccionConvocatorias } from '../components/presidente/SeccionConvocatorias';
import { SeleccionFinal } from '../components/presidente/SeleccionFinal';

export function PanelPresidente() {
  const { usuario } = useAutenticacion();
  const { tema, modoOscuro, esOscuro, sbBg, sbItemBase, sbItemActive, sbItemInactive } = useTheme();
  const d = usePanelPresidente(usuario);

  if (d.loading) {
    return (
      <RutaProtegida>
        <div className="flex justify-center py-32">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
        </div>
      </RutaProtegida>
    );
  }

  if (d.error) {
    return (
      <RutaProtegida>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-10">
            <p className="text-red-400 text-sm font-medium">{d.error}</p>
          </div>
        </div>
      </RutaProtegida>
    );
  }

  if (!d.club) {
    return <EstadoVacio />;
  }

  return (
    <RutaProtegida>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <BarraLateralPresidente
          vistaActiva={d.vistaActiva}
          onVistaChange={d.setVistaActiva}
          user={d.user}
          club={d.club}
        />

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <PestanasMovilPresidente
            vistaActiva={d.vistaActiva}
            onVistaChange={d.setVistaActiva}
          />

          <div className="mb-6 md:mb-8">
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-black break-words whitespace-normal ${tema.title}`}>
              Panel de Presidente
            </h1>
            <p className={`text-sm mt-1 ${tema.subtitle}`}>
              Bienvenido, {d.user.nombre_completo}
              <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold whitespace-nowrap">
                · Presidente de {d.club.nombre_club}
              </span>
            </p>
          </div>

          {d.vistaActiva === 'mi-club' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <InformacionClub club={d.club} />
                <SeccionAvisos club={d.club} esPresidente={true} />
                <div className={`rounded-2xl p-6 ${d.isDark ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                  <h3 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
                    Enviar Anuncio a Miembros
                  </h3>
                  <p className={`text-sm mb-6 ${tema.subtitle}`}>
                    Este anuncio se enviará como notificación a todos los alumnos inscritos en {d.club.nombre_club}.
                  </p>
                  <FormularioNotificacion
                    audienciaFija="club"
                    clubId={d.club.id_club}
                    clubNombre={d.club.nombre_club}
                  />
                </div>
              </div>
              <div className="space-y-8">
                <SeccionMiembros miembros={d.miembros} club={d.club} />
              </div>
            </div>
          )}

          {d.vistaActiva === 'solicitudes' && (
            <SolicitudesPresidente club={d.club} />
          )}

          {d.vistaActiva === 'convocatorias' && (
            <SeccionConvocatorias club={d.club} />
          )}

          {d.vistaActiva === 'seleccion-final' && (
            <SeleccionFinal club={d.club} />
          )}
        </main>
      </div>
    </RutaProtegida>
  );
}
