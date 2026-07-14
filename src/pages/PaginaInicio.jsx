/* Página de inicio con catálogo de clubes, hero. Muestra alerta si no hay sesión iniciada. */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { TarjetaClub } from '../components/clubes/TarjetaClub';
import { Heroe } from '../components/clubes/Heroe';
import { Spinner } from '../components/ui/Spinner';
import { Alerta } from '../components/ui/Alerta';
import { Icono } from '../components/ui/Icono';
import { obtenerUrlImagen } from '../utils/imagen';

export function PaginaInicio({ clubes, clubesLoading, onLoginClick }) {
  const navigate = useNavigate();
  const { estaAutenticado } = useAutenticacion();
  const { tema, modoOscuro } = useTheme();

  const clubesPorCategoria = useMemo(() => {
    const map = {};
    for (const club of clubes) {
      if (club.id_estatus_club === 2) {
        if (!map['Próximamente']) map['Próximamente'] = [];
        map['Próximamente'].push(club);
        continue;
      }
      const cat = club.categoria || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(club);
    }
    return map;
  }, [clubes]);

  return (
    <>
      <Heroe />
      <main id="catalogo" className="max-w-7xl mx-auto px-6 py-12 pb-24 md:pb-12">
        <div className="mb-10">
          <h2 className={`text-3xl font-black tracking-tight transition-colors duration-300 ${tema.title}`}>
            Explorar Clubes Disponibles
          </h2>
          <p className={`text-sm mt-1 transition-colors duration-300 ${tema.subtitle}`}>
            Catálogo oficial UNID
          </p>
        </div>

        {!estaAutenticado && (
          <Alerta tipo="warning" mensaje="Inicia sesión para inscribirte en un club." className="mb-8" />
        )}

        {clubesLoading ? (
          <Spinner className="py-20" />
        ) : clubes.length === 0 ? (
          <p className={`text-center py-20 text-lg ${tema.subtitle}`}>
            No hay clubes disponibles en esta categoría.
          </p>
        ) : (
          <>
            {/* Desktop: grid layout */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubes.map((club) => (
                  <TarjetaClub
                    key={club.id_club}
                    nombre={club.nombre_club}
                    descripcion={club.descripcion}
                    categoria={club.categoria}
                    cupoMaximo={club.cupo_maximo}
                    cupoActual={parseInt(club.cupo_actual) || 0}
                    imagen={obtenerUrlImagen(club.imagen_portada || club.imagen)}
                            onClick={() => navigate(`/club/${club.id_club}`, { state: { club } })}
                    idEstatusClub={club.id_estatus_club}
                    estatus={club.estatus}
                    estadoCalculado={club.estado_calculado}
                  />
                ))}
              </div>

              {/* Mobile: rows por categoria */}
            <div className="md:hidden space-y-8">
              {Object.entries(clubesPorCategoria).map(([categoria, clubs]) => (
                <section key={categoria}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${tema.title}`}>
                      {categoria}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      modoOscuro ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {clubs.length}
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.nf-scroll::-webkit-scrollbar { display: none; }`}</style>
                    {clubs.map((club) => (
                      <div key={club.id_club} className="nf-scroll shrink-0 w-64">
                        <TarjetaClub
                          nombre={club.nombre_club}
                          descripcion={club.descripcion}
                          categoria={club.categoria}
                          cupoMaximo={club.cupo_maximo}
                          cupoActual={parseInt(club.cupo_actual) || 0}
                          imagen={obtenerUrlImagen(club.imagen_portada || club.imagen)}
                  onClick={() => navigate(`/club/${club.id_club}`, { state: { club } })}
                          idEstatusClub={club.id_estatus_club}
                          estatus={club.estatus}
                          estadoCalculado={club.estado_calculado}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
