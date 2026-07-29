import { useRef, useEffect } from 'react';
import { api, getSession, setSession, clearSession } from '../services/api';
import { msalInstance, loginRequest } from '../services/authConfig';
import { jwtExpirado } from '../utils/jwt';

export function useInicializacionMsal({ onLoggedIn, onLoggedOut, onReady }) {
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;

    async function inicializar() {
      try {
        await msalInstance.initialize();

        const respuesta = await msalInstance.handleRedirectPromise();
        if (cancelado.current) return;

        if (respuesta?.accessToken) {
          const data = await api.loginMicrosoft(respuesta.accessToken);
          if (cancelado.current) return;
          setSession({ token: data.token, user: data.user });
          window.history.replaceState({}, document.title, window.location.pathname);
          onLoggedIn?.(data);
          return;
        }

        const cuentas = msalInstance.getAllAccounts();
        const sesion = getSession();
        const tokenExpirado = sesion?.token ? jwtExpirado(sesion.token) : true;

        if (cuentas.length > 0 && tokenExpirado) {
          try {
            const silencioso = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: cuentas[0],
            });
            if (!cancelado.current && silencioso?.accessToken) {
              const data = await api.loginMicrosoft(silencioso.accessToken);
              if (!cancelado.current) {
                setSession({ token: data.token, user: data.user });
                window.history.replaceState({}, document.title, window.location.pathname);
                onLoggedIn?.(data);
                return;
              }
            }
          } catch (err) {
            console.error('[MSAL] No se pudo renovar el token:', err);
          }
        }

        if (!sesion || tokenExpirado) {
          if (tokenExpirado) clearSession();
          onLoggedOut?.();
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          onLoggedIn?.({ user: sesion.user });
        }
      } catch (err) {
        console.error('[MSAL] Error en handleRedirectPromise:', err);
        window.history.replaceState({}, document.title, window.location.pathname);
      } finally {
        if (!cancelado.current) onReady?.();
      }
    }

    inicializar();
    return () => { cancelado.current = true; };
  }, []);
}
