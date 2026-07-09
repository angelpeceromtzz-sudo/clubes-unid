/* Panel del alumno: muestra su club (si es miembro) o sus postulaciones. Redirige según rol. */
import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { Icono } from '../components/ui/Icono';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { HorariosClub } from '../components/clubes/sections/HorariosClub';
import { SeccionAvisos } from '../components/presidente/SeccionAvisos';
import { SeccionMiembros } from '../components/presidente/SeccionMiembros';
import { SeccionPostulaciones } from '../components/presidente/SeccionPostulaciones';
import { usePanelAlumno } from '../hooks/usePanelAlumno';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { Alerta } from '../components/ui/Alerta';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

export function PanelAlumno() {
  const navigate = useNavigate();
  const { usuario, esPresidente, esAdmin, esRectoria } = useAutenticacion();
  const { tema, modoOscuro } = useTheme();
  const d = usePanelAlumno();
  const [dismissMiembroBanner, setDismissMiembroBanner] = useState(() => {
    try { return localStorage.getItem('dismiss_miembro_banner') === 'true'; } catch { return false; }
  });

  function descartarBanner() {
    setDismissMiembroBanner(true);
    try { localStorage.setItem('dismiss_miembro_banner', 'true'); } catch {}
  }

  const redirigir = useRef(false);

  useEffect(() => {
    if (redirigir.current) return;
    if (esPresidente) {
      redirigir.current = true;
      navigate('/presidente/dashboard', { replace: true });
    } else if (esAdmin) {
      redirigir.current = true;
      navigate('/admin/dashboard', { replace: true });
    } else if (esRectoria) {
      redirigir.current = true;
      navigate('/rectoria/dashboard', { replace: true });
    }
  }, [esPresidente, esAdmin, esRectoria, navigate]);

  if (esPresidente || esAdmin || esRectoria) {
    return <Spinner className="py-32" />;
  }

  const recargarPostulaciones = useCallback(() => {
    d.recargar();
  }, [d.recargar]);

  const esMiembroOficial = !!d.club;

  if (d.loading) {
    return <Spinner className="py-32" />;
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
    <ErrorBoundary>
    <RutaProtegida>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <EncabezadoPagina
            titulo={esMiembroOficial ? 'Mi Club' : 'Mis Postulaciones'}
            subtitulo={`Bienvenido, ${d?.user?.nombre_completo || usuario?.nombre_completo || ''}`}
          />
        </div>

        {!esMiembroOficial && d.postulaciones.length > 0 && (
          <div className="mb-10">
            <SeccionPostulaciones
              postulaciones={d.postulaciones}
              onPostulacionesChange={recargarPostulaciones}
            />
          </div>
        )}

        {d.club && (
          <div className="mt-10">
            {!dismissMiembroBanner && (
              <div className="mb-8 relative">
                <button
                  onClick={descartarBanner}
                  className={`absolute top-3 right-3 p-1 rounded-full transition-colors cursor-pointer z-10 ${modoOscuro ? 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300' : 'hover:bg-emerald-200 text-slate-500 hover:text-emerald-700'}`}
                  title="No mostrar más"
                >
                  <Icono nombre="close" className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <Alerta tipo="success">
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
                </Alerta>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <InformacionClub club={d.club} />
                <HorariosClub club={d.club} modoOscuro={modoOscuro} esAdmin={false} esPresidente={false} />
                <SeccionAvisos club={d.club} esPresidente={false} />
              </div>
              <div className="space-y-8">
                <SeccionMiembros miembros={d.miembros} club={d.club} />
              </div>
            </div>
          </div>
        )}
      </div>
    </RutaProtegida>
    </ErrorBoundary>
  );
}
