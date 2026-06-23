import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { InfoClub } from '../components/InfoClub';
import { AvisosSection } from '../components/AvisosSection';
import { MiembrosSection } from '../components/MiembrosSection';
import { useDashboardAlumno } from '../hooks/useDashboardAlumno';
import { SolicitudesPresidente } from '../components/SolicitudesPresidente';

export function DashboardAlumno({ tema, modoOscuro }) {
  const { user } = useAuth();
  const d = useDashboardAlumno(tema, modoOscuro);

  if (d.loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!d.club) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className={`text-lg font-medium ${tema.subtitle}`}>
            No tienes una inscripción activa.
          </p>
          <p className={`text-sm mt-2 ${tema.subtitle}`}>
            Explora el catálogo de clubes para inscribirte.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={`text-3xl font-black ${tema.title}`}>
            {d.esPresidente ? 'Panel de Presidente' : 'Mi Club'}
          </h1>
          <p className={`text-sm mt-1 ${tema.subtitle}`}>
            Bienvenido, {d.user.nombre_completo}
            {d.esPresidente && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                · Presidente de {d.club.nombre_club}
              </span>
            )}
          </p>
        </div>

        {d.esPresidente && (
          <div className="mb-10">
            <SolicitudesPresidente club={d.club} tema={tema} modoOscuro={modoOscuro} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <InfoClub club={d.club} tema={tema} modoOscuro={modoOscuro} />
            <AvisosSection club={d.club} esPresidente={d.esPresidente} tema={tema} modoOscuro={modoOscuro} />
          </div>
          <div className="space-y-8">
            <MiembrosSection miembros={d.miembros} club={d.club} tema={tema} modoOscuro={modoOscuro} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
