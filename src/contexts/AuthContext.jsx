
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getSession, setSession, clearSession } from '../services/api';
import { msalInstance, loginRequest } from '../services/authConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const session = getSession();
    return session ? session.user : null;
  });

  const [tieneInscripcionActiva, setTieneInscripcionActiva] = useState(false);

  const [clubesPostulados, setClubesPostulados] = useState([]);

  const fetchMisFormularios = useCallback(async () => {
    try {
      const clubs = await api.getMisFormularios();
      setClubesPostulados(clubs);
    } catch {
      setClubesPostulados([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log('[MSAL] Ejecutando verificación de redirección...');

      try {
        await msalInstance.initialize();
        console.log('[MSAL] Instancia inicializada correctamente');

        const response = await msalInstance.handleRedirectPromise();
        console.log('[MSAL] Respuesta encontrada:', response);

        if (cancelled) return;

        if (response?.accessToken) {
          const data = await api.loginMicrosoft(response.accessToken);
          if (cancelled) return;
          setSession({ token: data.token, user: data.user });
          setUser(data.user);
          try {
            const insc = await api.getInscripcionActiva();
            if (!cancelled) setTieneInscripcionActiva(!!insc);
          } catch {
            if (!cancelled) setTieneInscripcionActiva(false);
          }
          if (!cancelled && data.user.id_rol === 1) await fetchMisFormularios();

          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('[MSAL] Login completado, URL limpia');
          return;
        }

        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0 && !getSession()) {
          console.log('[MSAL] Intentando adquisición silenciosa con cuenta cacheada');
          const silent = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          });
          if (cancelled || !silent?.accessToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
          const data = await api.loginMicrosoft(silent.accessToken);
          if (cancelled) return;
          setSession({ token: data.token, user: data.user });
          setUser(data.user);
          try {
            const insc = await api.getInscripcionActiva();
            if (!cancelled) setTieneInscripcionActiva(!!insc);
          } catch {
            if (!cancelled) setTieneInscripcionActiva(false);
          }
          if (!cancelled && data.user.id_rol === 1) await fetchMisFormularios();
          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('[MSAL] Login silencioso completado, URL limpia');
          return;
        }

        const sesion = getSession();
        if (!sesion) {
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          if (!cancelled && sesion.user.id_rol === 1) await fetchMisFormularios();
        }
      } catch (err) {
        console.error('[MSAL] Error en handleRedirectPromise:', err);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const refreshInscripcionActiva = useCallback(async () => {
    try {
      const insc = await api.getInscripcionActiva();
      setTieneInscripcionActiva(!!insc);
    } catch {
      setTieneInscripcionActiva(false);
    }
  }, []);

  const login = useCallback(async (correo, password) => {
    try {
      const data = await api.login(correo, password);
      setSession({ token: data.token, user: data.user });
      setUser(data.user);
      try {
        const insc = await api.getInscripcionActiva();
        setTieneInscripcionActiva(!!insc);
      } catch {
        setTieneInscripcionActiva(false);
      }
      if (data.user.id_rol === 1) await fetchMisFormularios();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [fetchMisFormularios]);

  const loginMicrosoft = useCallback(async (accessToken) => {
    try {
      const data = await api.loginMicrosoft(accessToken);
      setSession({ token: data.token, user: data.user });
      setUser(data.user);
      try {
        const insc = await api.getInscripcionActiva();
        setTieneInscripcionActiva(!!insc);
      } catch {
        setTieneInscripcionActiva(false);
      }
      if (data.user.id_rol === 1) await fetchMisFormularios();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [fetchMisFormularios]);

  const logout = useCallback(() => {
    setUser(null);
    setTieneInscripcionActiva(false);
    clearSession();
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.id_rol === 3;
  const isPresidente = user?.id_rol === 2;

  const fetchInscripcionActiva = useCallback(async () => {
    try {
      return await api.getInscripcionActiva();
    } catch {
      return null;
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const inscripcion = await api.getInscripcionActiva();
      if (!inscripcion) return null;

      const club = await api.getClub(inscripcion.id_club);
      const avisos = await api.getAvisos(inscripcion.id_club);
      const esPresidente = club.id_presidente === user?.id;

      return { club, avisos, esPresidente, inscripcion };
    } catch {
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginMicrosoft,
        logout,
        isAuthenticated,
        isAdmin,
        isPresidente,
        tieneInscripcionActiva,
        clubesPostulados,
        setClubesPostulados,
        refreshInscripcionActiva,
        fetchInscripcionActiva,
        fetchDashboardData,
        fetchMisFormularios,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
