import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { TarjetaClub } from '../components/TarjetaClub';
import { Heroe } from '../components/Heroe';
import { DetalleClub } from '../components/DetalleClub';
import { api } from '../services/api';

export function PaginaInicio({ clubes, clubesLoading, tema, modoOscuro, onLoginClick, onClubDetalleChange }) {
  const { estaAutenticado, esAdmin, esPresidente, tieneInscripcionActiva } = useAutenticacion();
  const navigate = useNavigate();
  const [clubSeleccionado, setClubSeleccionado] = useState(null);

  useEffect(() => {
    if (estaAutenticado) {
      if (esAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else if (esPresidente) {
        navigate('/presidente/dashboard', { replace: true });
      } else if (tieneInscripcionActiva) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [estaAutenticado, esAdmin, esPresidente, tieneInscripcionActiva, navigate]);

  if (estaAutenticado && (esAdmin || esPresidente || tieneInscripcionActiva)) {
    return null;
  }

  if (clubSeleccionado) {
    return (
      <DetalleClub
        club={clubSeleccionado}
        onVolver={() => {
          setClubSeleccionado(null);
          onClubDetalleChange?.(false);
        }}
        tema={tema}
        modoOscuro={modoOscuro}
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
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
          </div>
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
                  onClubDetalleChange?.(true);
                }}
                modoOscuro={modoOscuro}
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
