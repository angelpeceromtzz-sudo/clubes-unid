/* Página de inicio con catálogo de clubes, hero. Muestra alerta si no hay sesión iniciada. */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { TarjetaClub } from '../components/clubes/TarjetaClub';
import { Heroe } from '../components/clubes/Heroe';
import { Spinner } from '../components/ui/Spinner';
import { Alerta } from '../components/ui/Alerta';
import { obtenerUrlImagen } from '../utils/imagen';

const ORDEN_ESTADO = ['abierto', 'proximo', 'lleno', 'cerrado'];
const ORDEN_CATEGORIA = ['Deportes', 'Cultura', 'Tecnologia'];

export function PaginaInicio({ clubes, clubesLoading, onLoginClick }) {
  const navigate = useNavigate();
  const { estaAutenticado } = useAutenticacion();
  const { tema } = useTheme();

  const clubesOrdenados = useMemo(() => {
    return [...clubes].sort((a, b) => {
      const estadoA = ORDEN_ESTADO.indexOf(a.estado_calculado);
      const estadoB = ORDEN_ESTADO.indexOf(b.estado_calculado);
      const rankEstadoA = estadoA === -1 ? ORDEN_ESTADO.length : estadoA;
      const rankEstadoB = estadoB === -1 ? ORDEN_ESTADO.length : estadoB;
      if (rankEstadoA !== rankEstadoB) return rankEstadoA - rankEstadoB;

      const catA = a.categoria || 'General';
      const catB = b.categoria || 'General';
      const prioA = ORDEN_CATEGORIA.indexOf(catA);
      const prioB = ORDEN_CATEGORIA.indexOf(catB);
      const rankCatA = prioA === -1 ? ORDEN_CATEGORIA.length : prioA;
      const rankCatB = prioB === -1 ? ORDEN_CATEGORIA.length : prioB;
      return rankCatA - rankCatB;
    });
  }, [clubes]);

  return (
    <>
      <Heroe />
      <main id="catalogo" className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-12 pb-24 md:pb-12">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-6 lg:gap-8">
            {clubesOrdenados.map((club) => (
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
        )}
      </main>
    </>
  );
}
