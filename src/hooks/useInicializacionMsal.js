import { useEffect } from 'react';
import { api, getSession, clearSession } from '../services/api';
import {
  capturarEpocaSesion,
  conservaEpocaSesion,
  iniciarSesionAlmacenada,
  limpiarCuentaConfianzaSiCoincide,
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
  useEffect(() => {
    // Bandera local por ejecución: evita que StrictMode reactive la primera
    // inicialización después de su cleanup.
    let cancelado = false;

    async function inicializar() {
      const epocaInicial = capturarEpocaSesion();
      const registrarRegreso = () => window.history.replaceState({}, document.title, rutaDeRegreso());

      async function adoptarGanadoraOSalir() {
        const ganadora = sesionActualVigente();
        registrarRegreso();
        if (cancelado) return;
        if (ganadora) await onLoggedIn?.({ user: ganadora.user });
        else onLoggedOut?.();
      }

      async function persistirLogin(data) {
        const persistida = await iniciarSesionAlmacenada({ token: data.token, user: data.user }, {
          epocaEsperada: epocaInicial,
          dispositivoConfiable: data.dispositivo_confiable,
          revocarDispositivo: data.dispositivo_confiable_revocado === true,
        });
        if (cancelado) return;
        if (!persistida) {
          // Otro login/logout ganó mientras esta operación esperaba el lock.
          await adoptarGanadoraOSalir();
          return;
        }
        registrarRegreso();
        await onLoggedIn?.({ ...data, sesionPersistida: true });
      }

      try {
        await msalInstance.initialize();
        const respuesta = await msalInstance.handleRedirectPromise();
        if (cancelado) return;

        if (respuesta?.accessToken) {
          const data = await api.loginMicrosoft(respuesta.accessToken);
          if (cancelado) return;
          if (!conservaEpocaSesion(epocaInicial)) {
            await adoptarGanadoraOSalir();
            return;
          }
          await persistirLogin(data);
          return;
        }

        if (!conservaEpocaSesion(epocaInicial)) {
          await adoptarGanadoraOSalir();
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
            if (cancelado) return;
            registrarRegreso();
            await onLoggedIn?.(data);
            return;
          } catch (err) {
            if (cancelado) return;
            if (Number(err?.status) === 409) {
              const sesionActual = sesionActualVigente();
              if (sesionActual) {
                // Otra pestaña hizo login mientras esperábamos la renovación.
                registrarRegreso();
                await onLoggedIn?.({ user: sesionActual.user });
                return;
              }
            }
            // api-core ya limpia de forma condicional un 401/403. No repetir
            // aquí esa limpieza: podría borrar el token nuevo de otra pestaña.
          }
        } else if (cuentaConfiable && idSesion && !coincideCuentaConfiable) {
          await limpiarCuentaConfianzaSiCoincide(cuentaConfiable, epocaInicial);
          if (cancelado) return;
        }

        const sesionGanadora = sesionActualVigente();
        if (sesionGanadora) {
          registrarRegreso();
          await onLoggedIn?.({ user: sesionGanadora.user });
          return;
        }
        if (!conservaEpocaSesion(epocaInicial)) {
          await adoptarGanadoraOSalir();
          return;
        }

        if (cuentas.length > 0 && necesitaNuevaSesion) {
          try {
            const silencioso = await msalInstance.acquireTokenSilent({
              ...loginRequest,
              account: cuentas[0],
            });
            if (cancelado) return;
            if (silencioso?.accessToken) {
              const data = await api.loginMicrosoft(silencioso.accessToken);
              if (cancelado) return;
              await persistirLogin(data);
              return;
            }
          } catch (err) {
            console.error('[MSAL] No se pudo renovar el token:', err);
          }
        }

        if (necesitaNuevaSesion) {
          if (!conservaEpocaSesion(epocaInicial)) {
            await adoptarGanadoraOSalir();
            return;
          }
          if (tokenExpirado || requiereRenovacion) {
            const limpio = await clearSession({ epocaEsperada: epocaInicial });
            if (cancelado) return;
            if (!limpio) {
              await adoptarGanadoraOSalir();
              return;
            }
          }
          onLoggedOut?.();
          registrarRegreso();
        } else {
          registrarRegreso();
          await onLoggedIn?.({ user: sesion.user });
        }
      } catch (err) {
        console.error('[MSAL] Error en handleRedirectPromise:', err);
        registrarRegreso();
      } finally {
        if (!cancelado) onReady?.();
      }
    }

    void inicializar();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
