/* Hook que redirige al usuario a su dashboard correspondiente tras el inicio de sesión. */
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
        if (id_rol === 4) navigate('/rectoria/dashboard', { replace: true });
        else if (id_rol === 3) navigate('/admin/dashboard', { replace: true });
        else if (id_rol === 2) navigate('/presidente/dashboard', { replace: true });
        else if (id_rol === 1 && tieneInscripcionActiva) navigate('/dashboard', { replace: true });
        else if (id_rol === 1) setRedireccionPendiente(true);
        else navigate('/', { replace: true });
      }
    }
    autenticacionAnterior.current = estaAutenticado;
  }, [estaAutenticado, navigate, tieneInscripcionActiva]);

  useEffect(() => {
    if (redireccionPendiente && tieneInscripcionActiva) {
      navigate('/dashboard', { replace: true });
      setRedireccionPendiente(false);
    }
  }, [redireccionPendiente, tieneInscripcionActiva, navigate]);

  function redirigirPostLogin() {
    const session = getSession();
    if (session?.user) {
      const { id_rol } = session.user;
      if (id_rol === 4) navigate('/rectoria/dashboard', { replace: true });
      else if (id_rol === 3) navigate('/admin/dashboard', { replace: true });
      else if (id_rol === 2) navigate('/presidente/dashboard', { replace: true });
      else if (id_rol === 1) {
        api.getInscripcionActiva().then((insc) => {
          if (insc) navigate('/dashboard', { replace: true });
        }).catch(() => {});
      }
    }
  }

  return { redirigirPostLogin };
}
