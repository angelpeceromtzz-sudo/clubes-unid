import { createContext, useContext, useState, useCallback } from 'react';
import { api, getSession, setSession, clearSession } from '../services/api';
import { useInicializacionMsal } from '../hooks/useInicializacionMsal';

const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children: hijos }) {
  const [usuario, setUsuario] = useState(() => {
    const sesion = getSession();
    return sesion?.user ?? null;
  });

  const [tieneInscripcionActiva, setTieneInscripcionActiva] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [clubesPostulados, setClubesPostulados] = useState([]);

  const obtenerMisFormularios = useCallback(async () => {
    try {
      const clubs = await api.getMisFormularios();
      setClubesPostulados(clubs);
    } catch {
      setClubesPostulados([]);
    }
  }, []);

  const despuesDeLogin = useCallback(async (data) => {
    setSession({ token: data.token, user: data.user });
    setUsuario(data.user);
    try {
      const insc = await api.getInscripcionActiva();
      setTieneInscripcionActiva(!!insc);
    } catch {
      setTieneInscripcionActiva(false);
    }
    if (data.user.id_rol === 1) await obtenerMisFormularios();
  }, [obtenerMisFormularios]);

  useInicializacionMsal({
    onLoggedIn: (data) => {
      if (data.token) {
        despuesDeLogin(data);
      } else {
        setUsuario(data.user);
        if (data.user?.id_rol === 1) obtenerMisFormularios();
      }
    },
    onLoggedOut: () => {
      setUsuario(null);
    },
    onReady: () => {
      setAuthReady(true);
    },
  });

  const refrescarInscripcionActiva = useCallback(async () => {
    try {
      const insc = await api.getInscripcionActiva();
      setTieneInscripcionActiva(!!insc);
    } catch {
      setTieneInscripcionActiva(false);
    }
  }, []);

  const iniciarSesion = useCallback(async (correo, password) => {
    try {
      const data = await api.login(correo, password);
      await despuesDeLogin(data);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [despuesDeLogin]);

  const iniciarSesionMicrosoft = useCallback(async (accessToken) => {
    try {
      const data = await api.loginMicrosoft(accessToken);
      await despuesDeLogin(data);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [despuesDeLogin]);

  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    setTieneInscripcionActiva(false);
    setClubesPostulados([]);
    clearSession();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('msal.')) {
        localStorage.removeItem(key);
      }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const obtenerInscripcionActiva = useCallback(async () => {
    try {
      return await api.getInscripcionActiva();
    } catch {
      return null;
    }
  }, []);

  const obtenerDatosPanel = useCallback(async () => {
    try {
      const inscripcion = await api.getInscripcionActiva();
      if (!inscripcion) return null;
      const club = await api.getClub(inscripcion.id_club);
      const avisos = await api.getAvisos(inscripcion.id_club);
      const esPresidente = club.id_presidente === usuario?.id;
      return { club, avisos, esPresidente, inscripcion };
    } catch {
      return null;
    }
  }, [usuario]);

  const estaAutenticado = !!usuario;
  const esAdmin = usuario?.id_rol === 3;
  const esPresidente = usuario?.id_rol === 2;
  const esRectoria = usuario?.id_rol === 4;

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuario, authReady,
        iniciarSesion, iniciarSesionMicrosoft, cerrarSesion,
        estaAutenticado, esAdmin, esPresidente, esRectoria,
        tieneInscripcionActiva, clubesPostulados,
        actualizarClubesPostulados: setClubesPostulados,
        refrescarInscripcionActiva,
        obtenerInscripcionActiva, obtenerDatosPanel, obtenerMisFormularios,
      }}
    >
      {hijos}
    </ContextoAutenticacion.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAutenticacion() {
  const ctx = useContext(ContextoAutenticacion);
  if (!ctx) throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  return ctx;
}
