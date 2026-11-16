/* Panel del alumno: muestra su perfil como vista principal, con navegación a
   inscripciones, historial de clubs y reconocimientos. */
import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { RutaProtegida } from '../components/layout/RutaProtegida';
import { Icono } from '../components/ui/Icono';
import { InformacionClub } from '../components/clubes/InformacionClub';
import { HorariosClub } from '../components/clubes/sections/HorariosClub';
import { SeccionAvisos } from '../components/responsable/secciones/SeccionAvisos';
import { SeccionMiembros } from '../components/responsable/secciones/SeccionMiembros';
import { SeccionPostulaciones } from '../components/responsable/secciones/SeccionPostulaciones';
import { usePanelAlumno } from '../hooks/usePanelAlumno';
import { Spinner } from '../components/ui/Spinner';
import { EncabezadoPagina } from '../components/ui/EncabezadoPagina';
import { NavegacionPanel } from '../components/layout/paneles-navegacion/NavegacionPanel';
import { ELEMENTOS_NAV_ALUMNO } from '../constants/navegacion';
import { Alerta } from '../components/ui/Alerta';
import { BotonAccion } from '../components/ui/BotonAccion';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { SeccionPerfilAlumno } from '../components/alumno/secciones/SeccionPerfilAlumno';
import { SeccionHistorialClubs } from '../components/alumno/secciones/SeccionHistorialClubs';
import { SeccionReconocimientos } from '../components/alumno/secciones/SeccionReconocimientos';

function EstadoSeccion({ mensaje, reintentar, children }) {
  if (!mensaje) return children;
  return <div role="alert" className="space-y-3"><Alerta tipo="error" mensaje={mensaje} /><BotonAccion variant="outline" onClick={reintentar}>Reintentar</BotonAccion></div>;
}

export function PanelAlumno() {
  const navigate = useNavigate();
  const { usuario, esResponsableClub, esAdmin, esRectoria, esResponsableMural } = useAutenticacion();
  const { tema, modoOscuro } = useTheme();
  const d = usePanelAlumno();
  const [dismissMiembroBanner, setDismissMiembroBanner] = useState(() => {
    try { return localStorage.getItem('dismiss_miembro_banner') === 'true'; } catch { return false; }
  });
  const [vistaAlumno, setVistaAlumno] = useState('perfil');

  function descartarBanner() {
    setDismissMiembroBanner(true);
    try { localStorage.setItem('dismiss_miembro_banner', 'true'); } catch { /* localStorage no disponible */ }
  }

  const redirigir = useRef(false);

  useEffect(() => {
    if (redirigir.current) return;
    if (esResponsableClub) {
      redirigir.current = true;
      navigate('/campus/campeche/portal/responsable-de-club/panel', { replace: true });
    } else if (esAdmin) {
      redirigir.current = true;
      navigate('/admin/panel', { replace: true });
    } else if (esRectoria) {
      redirigir.current = true;
      navigate('/rectoria/panel', { replace: true });
    } else if (esResponsableMural) {
      redirigir.current = true;
      navigate('/mural/panel', { replace: true });
    }
  }, [esResponsableClub, esAdmin, esRectoria, esResponsableMural, navigate]);

  const recargarPostulaciones = useCallback(() => {
    d.recargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.recargar]);

  if (esResponsableClub || esAdmin || esRectoria || esResponsableMural) {
    return <Spinner className="py-32" />;
  }

  const esMiembroOficial = !!d.club;

  if (d.loading) {
    return <Spinner className="py-32" />;
  }

  if (d.errores?.panel) return <RutaProtegida><div className="mx-auto max-w-4xl p-6"><EstadoSeccion mensaje={d.errores.panel} reintentar={d.recargar} /></div></RutaProtegida>;

  return (
    <ErrorBoundary>
    <RutaProtegida>
      <NavegacionPanel
        elementosNav={ELEMENTOS_NAV_ALUMNO}
        vistaActiva={vistaAlumno}
        onVistaChange={setVistaAlumno}
      >
        <div className="mb-6 md:mb-8">
          <EncabezadoPagina
            titulo={({ perfil: 'Mi perfil', 'mi-club': esMiembroOficial ? 'Mi club' : 'Mis postulaciones', horarios: 'Horarios', 'historial-clubs': 'Historial de inscripciones', reconocimientos: 'Reconocimientos' })[vistaAlumno]}
            subtitulo={`Bienvenido, ${d?.user?.nombre_completo || usuario?.nombre_completo || ''}`}
          />
        </div>

        {vistaAlumno === 'perfil' && <EstadoSeccion mensaje={d.errores?.preferencias} reintentar={d.recargar}><SeccionPerfilAlumno d={d} /></EstadoSeccion>}

        {vistaAlumno === 'mi-club' && (
          esMiembroOficial ? (
            <>
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
                      <span className="text-2xl">✓</span>
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
                  <SeccionAvisos club={d.club} esResponsableClub={false} />
                </div>
                <div className="space-y-8">
                  <EstadoSeccion mensaje={d.errores?.miembros} reintentar={d.recargar}><SeccionMiembros miembros={d.miembros} club={d.club} /></EstadoSeccion>
                </div>
              </div>
            </>
          ) : (
            <div className="max-w-6xl mx-auto px-6 py-10">
              <div className="mb-8">
                <EncabezadoPagina
                  titulo="Mis Postulaciones"
                  subtitulo={`Bienvenido, ${d?.user?.nombre_completo || usuario?.nombre_completo || ''}`}
                />
              </div>
<EstadoSeccion mensaje={d.errores?.postulaciones} reintentar={d.recargar}>
              {d.postulaciones.length > 0 ? (
                <div className="mb-10">
                  <SeccionPostulaciones
                    postulaciones={d.postulaciones}
                    onPostulacionesChange={recargarPostulaciones}
                  />
                </div>
              ) : (
                <p className={`text-sm ${tema.subtitle}`}>No tienes una inscripción activa ni postulaciones. Explora el catálogo de clubes para inscribirte.</p>
              )}
</EstadoSeccion>
            </div>
          )
        )}

        {vistaAlumno === 'horarios' && (
          esMiembroOficial ? (
            <HorariosClub club={d.club} modoOscuro={modoOscuro} esMiembro={esMiembroOficial} expandirHorarios={true} />
          ) : (
            <p className={`text-sm ${tema.subtitle}`}>No tienes un club activo para ver horarios.</p>
          )
        )}

        {vistaAlumno === 'historial-clubs' && (
          <EstadoSeccion mensaje={d.errores?.inscripciones} reintentar={d.recargar}><SeccionHistorialClubs inscripciones={d.inscripciones} /></EstadoSeccion>
        )}

        {vistaAlumno === 'reconocimientos' && <EstadoSeccion mensaje={d.errores?.reconocimientos} reintentar={d.recargar}><SeccionReconocimientos reconocimientos={d.reconocimientos} /></EstadoSeccion>}
      </NavegacionPanel>
    </RutaProtegida>
    </ErrorBoundary>
  );
}