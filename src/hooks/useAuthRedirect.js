/* Hook que redirige al usuario a su panel correspondiente tras el inicio de sesión. */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';
import { getSession, api } from '../services/api';

export function useAuthRedirect() {
  const { estaAutenticado, tieneInscripcionActiva } = useAutenticacion();
  const navigate = useNavigate();
  const autenticacionAnterior = useRef(estaAutenticado);
  const [redireccionPendiente, setRedireccionPendiente] = useState(false);

  useEffect(() => {
    if (estaAutenticado && !autenticacionAnterior.current) {
      const sesion = getSession();
      if (sesion?.user) {
        const { id_rol } = sesion.user;
        if (id_rol === 4) navigate('/rectoria/panel', { replace: true });
        else if (id_rol === 3 || id_rol === 7) navigate('/admin/panel', { replace: true });
        else if (id_rol === 6) navigate('/mural/panel', { replace: true });
        else if (id_rol === 2) navigate('/campus/campeche/portal/responsable-de-club/panel', { replace: true });
        else if (id_rol === 1 && tieneInscripcionActiva) navigate('/panel', { replace: true });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        else if (id_rol === 1) setRedireccionPendiente(true);
        else navigate('/campus/campeche/portal', { replace: true });
      }
    }
    autenticacionAnterior.current = estaAutenticado;
  }, [estaAutenticado, navigate, tieneInscripcionActiva]);

  useEffect(() => {
    if (redireccionPendiente && tieneInscripcionActiva) {
      navigate('/panel', { replace: true });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRedireccionPendiente(false);
    }
  }, [redireccionPendiente, tieneInscripcionActiva, navigate]);

  function redirigirPostLogin() {
    const session = getSession();
    if (session?.user) {
      const { id_rol } = session.user;
      if (id_rol === 4) navigate('/rectoria/panel', { replace: true });
      else if (id_rol === 3) navigate('/admin/panel', { replace: true });
      else if (id_rol === 6) navigate('/mural/panel', { replace: true });
      else if (id_rol === 2) navigate('/campus/campeche/portal/responsable-de-club/panel', { replace: true });
      else if (id_rol === 1) {
        api.getInscripcionActiva().then((insc) => {
          if (insc) navigate('/panel', { replace: true });
        }).catch(() => {});
      }
    }
  }

  return { redirigirPostLogin };
}
