import { useState, useEffect } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { TarjetaClub } from '../components/clubes/TarjetaClub';
import { Heroe } from '../components/clubes/Heroe';
import { DetalleClub } from '../components/clubes/DetalleClub';
import { Spinner } from '../components/ui/Spinner';

export function PaginaInicio({ clubes, clubesLoading, onLoginClick, onClubDetalleChange }) {
  const { estaAutenticado } = useAutenticacion();
  const { tema, modoOscuro } = useTheme();
  const [clubSeleccionado, setClubSeleccionado] = useState(null);

  useEffect(() => {
    onClubDetalleChange?.(clubSeleccionado !== null);
  }, [clubSeleccionado, onClubDetalleChange]);

  if (clubSeleccionado) {
    return (
      <DetalleClub
        club={clubSeleccionado}
        onVolver={() => {
          setClubSeleccionado(null);
        }}
        onLoginClick={onLoginClick}
      />
    );
  }

  return (
    <>
      <Heroe />
      <main id="catalogo" className="max-w-7xl mx-auto px-6 py-12 pb-20 md:pb-12">
        <div className="mb-10">
          <h2 className={`text-3xl font-black tracking-tight transition-colors duration-300 ${tema.title}`}>
            Explorar Clubes Disponibles
          </h2>
          <p className={`text-sm mt-1 transition-colors duration-300 ${tema.subtitle}`}>
            Catálogo oficial UNID
          </p>
        </div>

        {!estaAutenticado && (
          <div className="mb-8 bg-amber-400/10 border border-amber-400/20 rounded-xl px-5 py-3">
            <p className="text-sm text-amber-400 font-medium">
              Inicia sesión para inscribirte en un club.
            </p>
          </div>
        )}

        {clubesLoading ? (
          <Spinner className="py-20" />
        ) : clubes.length === 0 ? (
          <p className={`text-center py-20 text-lg ${tema.subtitle}`}>
            No hay clubes disponibles en esta categoría.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubes.map((club) => (
              <TarjetaClub
                key={club.id_club}
                id={club.id_club}
                nombre={club.nombre_club}
                descripcion={club.descripcion}
                categoria={club.categoria}
                cupoMaximo={club.cupo_maximo}
                cupoActual={parseInt(club.cupo_actual) || 0}
                imagen={club.imagen_portada || club.imagen}
                onClick={() => {
                  setClubSeleccionado(club);
                }}
                idEstatusClub={club.id_estatus_club}
                estatus={club.estatus}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
