import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { NotificacionForm } from '../components/NotificacionForm';
import { InfoClub } from '../components/InfoClub';
import { AvisosSection } from '../components/AvisosSection';
import { MiembrosSection } from '../components/MiembrosSection';
import { useDashboardPresidente } from '../hooks/useDashboardPresidente';
import { PresidenteSidebar } from '../components/presidente/PresidenteSidebar';
import { PresidenteMobileTabs } from '../components/presidente/PresidenteMobileTabs';
import { BloquesHorariosSection } from '../components/presidente/BloquesHorariosSection';
import { EmptyState } from '../components/presidente/EmptyState';
import { SolicitudesPresidente } from '../components/SolicitudesPresidente';

export function DashboardPresidente({ tema, modoOscuro }) {
  const { user } = useAuth();
  const d = useDashboardPresidente(user, tema, modoOscuro);

  if (d.loading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center py-32">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
        </div>
      </ProtectedRoute>
    );
  }

  if (d.error) {
    return (
      <ProtectedRoute>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-10">
            <p className="text-red-400 text-sm font-medium">{d.error}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!d.club) {
    return <EmptyState tema={tema} />;
  }

  const sbBg = d.isDark ? 'bg-[#0a1128] border-slate-800' : 'bg-slate-900 border-slate-700';
  const sbItemBase = 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer';
  const sbItemActive = 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
  const sbItemInactive = d.isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/50';

  return (
    <ProtectedRoute>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <PresidenteSidebar
          vistaActiva={d.vistaActiva}
          onVistaChange={d.setVistaActiva}
          user={d.user}
          club={d.club}
          isDark={d.isDark}
          sbBg={sbBg}
          sbItemBase={sbItemBase}
          sbItemActive={sbItemActive}
          sbItemInactive={sbItemInactive}
        />

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <PresidenteMobileTabs
            vistaActiva={d.vistaActiva}
            onVistaChange={d.setVistaActiva}
            isDark={d.isDark}
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
                <InfoClub club={d.club} tema={tema} modoOscuro={modoOscuro} />
                <AvisosSection club={d.club} esPresidente={true} tema={tema} modoOscuro={modoOscuro} />
                <div className={`rounded-2xl p-6 ${d.isDark ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                  <h3 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
                    Enviar Anuncio a Miembros
                  </h3>
                  <p className={`text-sm mb-6 ${tema.subtitle}`}>
                    Este anuncio se enviará como notificación a todos los alumnos inscritos en {d.club.nombre_club}.
                  </p>
                  <NotificacionForm
                    audienciaFija="club"
                    clubId={d.club.id_club}
                    clubNombre={d.club.nombre_club}
                    tema={tema}
                    modoOscuro={modoOscuro}
                  />
                </div>
              </div>
              <div className="space-y-8">
                <MiembrosSection miembros={d.miembros} club={d.club} tema={tema} modoOscuro={modoOscuro} />
              </div>
            </div>
          )}

          {d.vistaActiva === 'solicitudes' && (
            <SolicitudesPresidente club={d.club} tema={tema} modoOscuro={modoOscuro} />
          )}

          {d.vistaActiva === 'bloques' && (
            <BloquesHorariosSection club={d.club} tema={tema} modoOscuro={modoOscuro} />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
