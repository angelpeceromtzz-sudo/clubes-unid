import { useAutenticacion } from '../contexts/AuthContext';
import { RutaProtegida } from '../components/RutaProtegida';
import { InformacionClub } from '../components/InformacionClub';
import { SeccionAvisos } from '../components/SeccionAvisos';
import { SeccionMiembros } from '../components/SeccionMiembros';
import { SeccionPostulaciones } from '../components/SeccionPostulaciones';
import { usePanelAlumno } from '../hooks/usePanelAlumno';
import { SolicitudesPresidente } from '../components/SolicitudesPresidente';

export function PanelAlumno({ tema, modoOscuro }) {
  const { usuario } = useAutenticacion();
  const d = usePanelAlumno(tema, modoOscuro);

  if (d.loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!d.club && d.postulaciones.length === 0) {
    return (
      <RutaProtegida>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className={`text-lg font-medium ${tema.subtitle}`}>
            No tienes una inscripción activa ni postulaciones.
          </p>
          <p className={`text-sm mt-2 ${tema.subtitle}`}>
            Explora el catálogo de clubes para inscribirte.
          </p>
        </div>
      </RutaProtegida>
    );
  }

  return (
    <RutaProtegida>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={`text-3xl font-black ${tema.title}`}>
            {d.esPresidente ? 'Panel de Presidente' : 'Mi Panel'}
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

        {!d.esPresidente && d.postulaciones.length > 0 && (
          <div className="mb-10">
            <SeccionPostulaciones postulaciones={d.postulaciones} tema={tema} />
          </div>
        )}

        {d.club && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <InformacionClub club={d.club} tema={tema} modoOscuro={modoOscuro} />
              <SeccionAvisos club={d.club} esPresidente={d.esPresidente} tema={tema} modoOscuro={modoOscuro} />
            </div>
            <div className="space-y-8">
              <SeccionMiembros miembros={d.miembros} club={d.club} tema={tema} modoOscuro={modoOscuro} />
            </div>
          </div>
        )}
      </div>
    </RutaProtegida>
  );
}
