import { useRef, useEffect } from 'react';
import { api, getSession, clearSession } from '../services/api';
import {
  capturarEpocaSesion,
  conservaEpocaSesion,
  iniciarSesionAlmacenada,
  limpiarCuentaConfiable,
  obtenerCuentaConfiable,
  renovarSesionConfiable,
} from '../services/api-core';
import { msalInstance, loginRequest } from '../services/authConfig';
import { jwtExpirado, jwtRequiereRenovacion } from '../utils/jwt';
import { rutaRegresoActividades } from '../utils/rutaRegresoActividades';

function rutaDeRegreso() {
  return rutaRegresoActividades(window.location.pathname, window.location.search);
}

function sesionActualVigente() {
  const sesion = getSession();
  if (!sesion?.token || !sesion?.user) return null;
  if (jwtExpirado(sesion.token) || jwtRequiereRenovacion(sesion.token)) return null;
  return sesion;
}

export function useInicializacionMsal({ onLoggedIn, onLoggedOut, onReady }) {
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;

    async function inicializar() {
      const epocaInicial = capturarEpocaSesion();
      try {
        await msalInstance.initialize();

        const respuesta = await msalInstance.handleRedirectPromise();
        if (cancelado.current) return;

        if (respuesta?.accessToken) {
          const data = await api.loginMicrosoft(respuesta.accessToken);
          if (cancelado.current) return;
          // Una sesión previa con la misma época no sustituye este login recién
          // completado. Sólo una pestaña que cambió la época durante la espera
          // puede haber dejado una sesión concurrente más reciente.
          if (!conservaEpocaSesion(epocaInicial)) {
            const sesionGanadora = sesionActualVigente();
            if (sesionGanadora) {
              window.history.replaceState({}, document.title, rutaDeRegreso());
              onLoggedIn?.({ user: sesionGanadora.user });
              return;
            }
          }
          iniciarSesionAlmacenada({ token: data.token, user: data.user });
          window.history.replaceState({}, document.title, rutaDeRegreso());
          onLoggedIn?.({ ...data, sesionPersistida: true });
          return;
        }

        if (!conservaEpocaSesion(epocaInicial)) {
          const sesionGanadora = sesionActualVigente();
          if (sesionGanadora) {
            window.history.replaceState({}, document.title, rutaDeRegreso());
            onLoggedIn?.({ user: sesionGanadora.user });
          } else {
            onLoggedOut?.();
            window.history.replaceState({}, document.title, rutaDeRegreso());
          }
          return;
        }

        const cuentas = msalInstance.getAllAccounts();
        const sesion = getSession();
        const tokenExpirado = sesion?.token ? jwtExpirado(sesion.token) : true;
        const requiereRenovacion = sesion?.token ? jwtRequiereRenovacion(sesion.token) : false;
        const necesitaNuevaSesion = !sesion || tokenExpirado || requiereRenovacion;

        const cuentaConfiable = obtenerCuentaConfiable();
        const idSesion = sesion?.user?.id_usuario ?? sesion?.user?.id;
        const coincideCuentaConfiable = cuentaConfiable
          && (!idSesion || Number(cuentaConfiable.id_usuario) === Number(idSesion));

        if (necesitaNuevaSesion && coincideCuentaConfiable) {
          try {
            const data = await renovarSesionConfiable();
            if (cancelado.current) return;
            window.history.replaceState({}, document.title, rutaDeRegreso());
            onLoggedIn?.(data);
            return;
          } catch (err) {
            if (Number(err?.status) === 409 && !cancelado.current) {
              const sesionActual = sesionActualVigente();
              if (sesionActual) {
                // Otra pestaña hizo login mientras esperábamos la renovación.
                // Usamos su sesión vigente y no limpiamos/reemplazamos la nueva.
                window.history.replaceState({}, document.title, rutaDeRegreso());
                onLoggedIn?.({ user: sesionActual.user });
                return;
              }
            }
            if (Number(err?.status) === 401 || Number(err?.status) === 403) limpiarCuentaConfiable();
          }
        } else if (cuentaConfiable && idSesion && !coincideCuentaConfiable) {
          limpiarCuentaConfiable();
        }

        const sesionGanadora = sesionActualVigente();
        if (sesionGanadora) {
          window.history.replaceState({}, document.title, rutaDeRegreso());
          onLoggedIn?.({ user: sesionGanadora.user });
          return;
        }
        if (!conservaEpocaSesion(epocaInicial)) {
          onLoggedOut?.();
          window.history.replaceState({}, document.title, rutaDeRegreso());
          return;
        }

        if (cuentas.length > 0 && necesitaNuevaSesion) {
          try {
            const silencioso = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: cuentas[0],
            });
            if (!cancelado.current && silencioso?.accessToken) {
              const data = await api.loginMicrosoft(silencioso.accessToken);
              if (!cancelado.current) {
                if (!conservaEpocaSesion(epocaInicial)) {
                  const sesionGanadora = sesionActualVigente();
                  if (sesionGanadora) {
                    window.history.replaceState({}, document.title, rutaDeRegreso());
                    onLoggedIn?.({ user: sesionGanadora.user });
                    return;
                  }
                  onLoggedOut?.();
                  window.history.replaceState({}, document.title, rutaDeRegreso());
                  return;
                }
                iniciarSesionAlmacenada({ token: data.token, user: data.user });
                window.history.replaceState({}, document.title, rutaDeRegreso());
                onLoggedIn?.({ ...data, sesionPersistida: true });
                return;
              }
            }
          } catch (err) {
            console.error('[MSAL] No se pudo renovar el token:', err);
          }
        }

        if (necesitaNuevaSesion) {
          if (!conservaEpocaSesion(epocaInicial)) {
            const sesionGanadora = sesionActualVigente();
            if (sesionGanadora) {
              window.history.replaceState({}, document.title, rutaDeRegreso());
              onLoggedIn?.({ user: sesionGanadora.user });
              return;
            }
            onLoggedOut?.();
            window.history.replaceState({}, document.title, rutaDeRegreso());
            return;
          }
          if (tokenExpirado || requiereRenovacion) clearSession();
          onLoggedOut?.();
          window.history.replaceState({}, document.title, rutaDeRegreso());
        } else {
          onLoggedIn?.({ user: sesion.user });
        }
      } catch (err) {
        console.error('[MSAL] Error en handleRedirectPromise:', err);
        window.history.replaceState({}, document.title, rutaDeRegreso());
      } finally {
        if (!cancelado.current) onReady?.();
      }
    }

    inicializar();
    return () => { cancelado.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
