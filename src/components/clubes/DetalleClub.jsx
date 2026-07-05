import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FormularioInscripcion } from '../formularios/FormularioInscripcion';
import { Spinner } from '../ui/Spinner';
import { api } from '../../services/api';
import { HeroClub } from './sections/HeroClub';
import { DescripcionClub } from './sections/DescripcionClub';
import { AprendizajeClub } from './sections/AprendizajeClub';
import { RequisitosClub } from './sections/RequisitosClub';
import { HorariosClub } from './sections/HorariosClub';
import { LugarClub } from './sections/LugarClub';
import { PresidenteClub } from './sections/PresidenteClub';
import { EventosClub } from './sections/EventosClub';
import { GaleriaClub } from './sections/GaleriaClub';
import { InfoAdicionalClub } from './sections/InfoAdicionalClub';
import { FAQClub } from './sections/FAQClub';

export function DetalleClub({ onLoginClick }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { modoOscuro } = useTheme();
  const { estaAutenticado, esAdmin, tieneInscripcionActiva, clubesPostulados } = useAutenticacion();
  const [club, setClub] = useState(location.state?.club || null);
  const [loading, setLoading] = useState(!club);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    if (!club) {
      api.getClub(id)
        .then((data) => setClub(data))
        .catch(() => navigate('/'))
        .finally(() => setLoading(false));
    }
  }, []);

  const esProximamente = club?.id_estatus_club === 2;
  const esInactivo = club?.id_estatus_club === 3;
  const cupoActual = parseInt(club?.cupo_actual) || 0;
  const lleno = cupoActual >= (club?.cupo_maximo || 0);

  function obtenerTextoBoton() {
    if (esProximamente) return null;
    if (esInactivo) return null;
    if (lleno) return null;
    if (!estaAutenticado) return 'INICIA SESIÓN PARA INSCRIBIRTE';
    if (esAdmin) return null;
    if (tieneInscripcionActiva) return null;
    return 'INSCRIBIRME AHORA';
  }

  const botonTexto = obtenerTextoBoton();

  function manejarClickBoton() {
    if (!estaAutenticado) {
      onLoginClick();
    } else if (esAdmin) {
      return;
    } else if (tieneInscripcionActiva) {
      alert("Ya eres miembro activo de un club.");
    } else if (clubesPostulados.includes(club.id_club)) {
      alert("Ya enviaste una solicitud para este club. No puedes duplicarla.");
    } else if (clubesPostulados.length >= 3) {
      alert("Ya tienes 3 postulaciones en proceso. Espera una respuesta.");
    } else {
      setMostrarFormulario(true);
    }
  }

  if (loading) {
    return <Spinner className="py-20" />;
  }

  if (!club) {
    return null;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8 pb-20 md:pb-8 space-y-10">
        <HeroClub
          club={club}
          modoOscuro={modoOscuro}
          onBotonClick={manejarClickBoton}
          botonTexto={botonTexto}
          estaAutenticado={estaAutenticado}
          esAdmin={esAdmin}
          tieneInscripcionActiva={tieneInscripcionActiva}
        />

        <DescripcionClub club={club} modoOscuro={modoOscuro} />

        <AprendizajeClub modoOscuro={modoOscuro} />

        <RequisitosClub modoOscuro={modoOscuro} />

        <HorariosClub horarios={club.horarios} modoOscuro={modoOscuro} />

        <LugarClub lugar={club.lugar} modoOscuro={modoOscuro} />

        <PresidenteClub modoOscuro={modoOscuro} />

        <EventosClub modoOscuro={modoOscuro} />

        <GaleriaClub modoOscuro={modoOscuro} />

        <InfoAdicionalClub club={club} modoOscuro={modoOscuro} />

        <FAQClub modoOscuro={modoOscuro} />
      </div>

      {mostrarFormulario && (
        <FormularioInscripcion
          club={club}
          onClose={() => setMostrarFormulario(false)}
        />
      )}
    </>
  );
}
