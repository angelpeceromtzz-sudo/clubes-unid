import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { RutaProtegida } from '../components/RutaProtegida';
import { Icono } from '../components/ui/Icono';
import { InformacionClub } from '../components/InformacionClub';
import { SeccionAvisos } from '../components/SeccionAvisos';
import { SeccionMiembros } from '../components/SeccionMiembros';
import { SeccionPostulaciones } from '../components/SeccionPostulaciones';
import { usePanelAlumno } from '../hooks/usePanelAlumno';

export function PanelAlumno({ tema, modoOscuro }) {
  const navigate = useNavigate();
  const { usuario, esPresidente, esAdmin, esRectoria } = useAutenticacion();
  const d = usePanelAlumno(tema, modoOscuro);
  const [dismissMiembroBanner, setDismissMiembroBanner] = useState(() => {
    try { return localStorage.getItem('dismiss_miembro_banner') === 'true'; } catch { return false; }
  });

  function descartarBanner() {
    setDismissMiembroBanner(true);
    try { localStorage.setItem('dismiss_miembro_banner', 'true'); } catch {}
  }

  if (esPresidente) {
    navigate('/presidente/dashboard', { replace: true });
    return null;
  }

  if (esAdmin) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  if (esRectoria) {
    navigate('/rectoria/dashboard', { replace: true });
    return null;
  }

  const esMiembroOficial = !!d.club;

  const recargarPostulaciones = useCallback(() => {
    d.recargar();
  }, [d]);

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
            {esMiembroOficial ? `Mi Club` : `Mis Postulaciones`}
          </h1>
          <p className={`text-sm mt-1 ${tema.subtitle}`}>
            Bienvenido, {d.user.nombre_completo}
          </p>
        </div>

        {!esMiembroOficial && d.postulaciones.length > 0 && (
          <div className="mb-10">
            <SeccionPostulaciones
              postulaciones={d.postulaciones}
              tema={tema}
              onPostulacionesChange={recargarPostulaciones}
            />
          </div>
        )}

        {d.club && (
          <div className="mt-10">
            {!dismissMiembroBanner && (
              <div className={`relative rounded-2xl p-6 border mb-8 ${modoOscuro ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <button
                  onClick={descartarBanner}
                  className={`absolute top-3 right-3 p-1 rounded-full transition-colors cursor-pointer ${modoOscuro ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300' : 'hover:bg-emerald-200 text-slate-500 hover:text-emerald-700'}`}
                  title="No mostrar más"
                >
                  <Icono nombre="close" className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <h2 className={`text-lg font-black uppercase tracking-wider ${modoOscuro ? 'text-emerald-300' : 'text-emerald-700'}`}>
                      Miembro de {d.club.nombre_club}
                    </h2>
                    <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                      Eres miembro oficial de este club
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <InformacionClub club={d.club} tema={tema} modoOscuro={modoOscuro} />
                <SeccionAvisos club={d.club} esPresidente={false} tema={tema} modoOscuro={modoOscuro} />
              </div>
              <div className="space-y-8">
                <SeccionMiembros miembros={d.miembros} club={d.club} tema={tema} modoOscuro={modoOscuro} />
              </div>
            </div>
          </div>
        )}
      </div>
    </RutaProtegida>
  );
}
