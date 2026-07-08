
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getSession, setSession, clearSession } from '../services/api';
import { msalInstance, loginRequest } from '../services/authConfig';

function jwtExpirado(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children: hijos }) {
  const [usuario, setUsuario] = useState(() => {
    const sesion = getSession();
    if (!sesion?.token) return null;
    if (jwtExpirado(sesion.token)) {
      clearSession();
      return null;
    }
    return sesion.user;
  });

  const [tieneInscripcionActiva, setTieneInscripcionActiva] = useState(false);

  const [clubesPostulados, setClubesPostulados] = useState([]);

  const obtenerMisFormularios = useCallback(async () => {
    try {
      const clubs = await api.getMisFormularios();
      setClubesPostulados(clubs);
    } catch {
      setClubesPostulados([]);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function inicializar() {
      console.log('[MSAL] Ejecutando verificación de redirección...');

      try {
        await msalInstance.initialize();
        console.log('[MSAL] Instancia inicializada correctamente');

        const respuesta = await msalInstance.handleRedirectPromise();
        console.log('[MSAL] Respuesta encontrada:', respuesta);

        if (cancelado) return;

        if (respuesta?.accessToken) {
          const data = await api.loginMicrosoft(respuesta.accessToken);
          if (cancelado) return;
          setSession({ token: data.token, user: data.user });
          setUsuario(data.user);
          try {
            const insc = await api.getInscripcionActiva();
            if (!cancelado) setTieneInscripcionActiva(!!insc);
          } catch {
            if (!cancelado) setTieneInscripcionActiva(false);
          }
          if (!cancelado && data.user.id_rol === 1) await obtenerMisFormularios();

          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('[MSAL] Login completado, URL limpia');
          return;
        }

        const cuentas = msalInstance.getAllAccounts();
        const sesion = getSession();
        const tokenExpirado = sesion?.token ? jwtExpirado(sesion.token) : true;

        if (cuentas.length > 0 && tokenExpirado) {
          console.log('[MSAL] Token expirado. Intentando renovación silenciosa...');
          try {
            const silencioso = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: cuentas[0],
            });
            if (!cancelado && silencioso?.accessToken) {
              const data = await api.loginMicrosoft(silencioso.accessToken);
              if (!cancelado) {
                setSession({ token: data.token, user: data.user });
                setUsuario(data.user);
                try {
                  const insc = await api.getInscripcionActiva();
                  if (!cancelado) setTieneInscripcionActiva(!!insc);
                } catch {
                  if (!cancelado) setTieneInscripcionActiva(false);
                }
                if (!cancelado && data.user.id_rol === 1) await obtenerMisFormularios();
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('[MSAL] Token renovado silenciosamente');
                return;
              }
            }
          } catch (err) {
            console.error('[MSAL] No se pudo renovar el token:', err);
          }
        }

        if (!sesion || tokenExpirado) {
          if (tokenExpirado) clearSession();
          setUsuario(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          if (!cancelado && sesion.user.id_rol === 1) await obtenerMisFormularios();
        }
      } catch (err) {
        console.error('[MSAL] Error en handleRedirectPromise:', err);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    inicializar();
    return () => { cancelado = true; };
  }, []);

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
      setSession({ token: data.token, user: data.user });
      setUsuario(data.user);
      try {
        const insc = await api.getInscripcionActiva();
        setTieneInscripcionActiva(!!insc);
      } catch {
        setTieneInscripcionActiva(false);
      }
      if (data.user.id_rol === 1) await obtenerMisFormularios();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [obtenerMisFormularios]);

  const iniciarSesionMicrosoft = useCallback(async (accessToken) => {
    try {
      const data = await api.loginMicrosoft(accessToken);
      setSession({ token: data.token, user: data.user });
      setUsuario(data.user);
      try {
        const insc = await api.getInscripcionActiva();
        setTieneInscripcionActiva(!!insc);
      } catch {
        setTieneInscripcionActiva(false);
      }
      if (data.user.id_rol === 1) await obtenerMisFormularios();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [obtenerMisFormularios]);

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

  const estaAutenticado = !!usuario;
  const esAdmin = usuario?.id_rol === 3;
  const esPresidente = usuario?.id_rol === 2;
  const esRectoria = usuario?.id_rol === 4;

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

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuario,
        iniciarSesion,
        iniciarSesionMicrosoft,
        cerrarSesion,
        estaAutenticado,
        esAdmin,
        esPresidente,
        esRectoria,
        tieneInscripcionActiva,
        clubesPostulados,
        actualizarClubesPostulados: setClubesPostulados,
        refrescarInscripcionActiva,
        obtenerInscripcionActiva,
        obtenerDatosPanel,
        obtenerMisFormularios,
      }}
    >
      {hijos}
    </ContextoAutenticacion.Provider>
  );
}

export function useAutenticacion() {
  const ctx = useContext(ContextoAutenticacion);
  if (!ctx) throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  return ctx;
}
