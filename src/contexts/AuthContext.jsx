import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getSession, clearSession } from '../services/api';
import {
  guardarCuentaConfiable,
  iniciarSesionAlmacenada,
  limpiarCuentaConfiable,
  revocarCuentaConfiableEnServidor,
} from '../services/api-core';
import { useInicializacionMsal } from '../hooks/useInicializacionMsal';
import { errorRequiereNombreOtp } from '../utils/nombreOtp';

const ContextoAutenticacion = createContext(null);
const CAMPOS_RELEVANTES_USUARIO = [
  'nombre_completo',
  'correo_institucional',
  'institutional_id',
  'id_licenciatura',
  'rol',
];

function idDeUsuario(usuario) {
  return usuario?.id_usuario ?? usuario?.id;
}

function mismosDatosRelevantes(actual, nuevo) {
  const idActual = idDeUsuario(actual);
  const idNuevo = idDeUsuario(nuevo);
  if (idActual == null || idNuevo == null || String(idActual) !== String(idNuevo)) return false;
  if (Number(actual?.id_rol) !== Number(nuevo?.id_rol)) return false;

  return CAMPOS_RELEVANTES_USUARIO.every(
    (campo) => (actual?.[campo] ?? null) === (nuevo?.[campo] ?? null),
  );
}

export function ProveedorAutenticacion({ children: hijos }) {
  const [usuario, setUsuario] = useState(() => {
    const sesion = getSession();
    return sesion?.user ?? null;
  });

  const [tieneInscripcionActiva, setTieneInscripcionActiva] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [clubesPostulados, setClubesPostulados] = useState([]);

  const actualizarUsuario = useCallback((nuevoUsuario) => {
    if (!nuevoUsuario) return;
    setUsuario((actual) => (
      actual && mismosDatosRelevantes(actual, nuevoUsuario) ? actual : nuevoUsuario
    ));
  }, []);

  const limpiarEstadoSesion = useCallback(() => {
    setUsuario(null);
    setTieneInscripcionActiva(false);
    setClubesPostulados([]);
  }, []);

  useEffect(() => {
    const alRenovarSesion = (evento) => {
      if (evento.detail) actualizarUsuario(evento.detail);
    };
    window.addEventListener('clubsunid:session-refreshed', alRenovarSesion);
    return () => window.removeEventListener('clubsunid:session-refreshed', alRenovarSesion);
  }, [actualizarUsuario]);

  const obtenerMisFormularios = useCallback(async () => {
    try {
      const clubs = await api.getMisFormularios();
      setClubesPostulados(clubs);
    } catch {
      setClubesPostulados([]);
    }
  }, []);

  const cargarDatosPosteriores = useCallback(async (user) => {
    try {
      const insc = await api.getInscripcionActiva();
      setTieneInscripcionActiva(!!insc);
    } catch {
      setTieneInscripcionActiva(false);
    }
    if (user?.id_rol === 1) await obtenerMisFormularios();
  }, [obtenerMisFormularios]);

  useEffect(() => {
    const alCambiarSesionOtraPestana = (evento) => {
      if (evento.key !== null && evento.key !== 'unid_session') return;
      if (!evento.newValue) {
        limpiarEstadoSesion();
        return;
      }

      try {
        const sesion = JSON.parse(evento.newValue);
        if (!sesion?.user) {
          limpiarEstadoSesion();
          return;
        }
        actualizarUsuario(sesion.user);
        void cargarDatosPosteriores(sesion.user);
      } catch {
        limpiarEstadoSesion();
      }
    };

    window.addEventListener('storage', alCambiarSesionOtraPestana);
    return () => window.removeEventListener('storage', alCambiarSesionOtraPestana);
  }, [actualizarUsuario, cargarDatosPosteriores, limpiarEstadoSesion]);

  const aplicarDatosLogin = useCallback(async (data) => {
    if (data.dispositivo_confiable?.token) {
      guardarCuentaConfiable(data.dispositivo_confiable, data.user);
    } else if (data.dispositivo_confiable_revocado) {
      limpiarCuentaConfiable();
    }
    setUsuario(data.user);
    await cargarDatosPosteriores(data.user);
  }, [cargarDatosPosteriores]);

  const despuesDeLogin = useCallback(async (data) => {
    // La época nueva invalida cualquier renovación capturada por otra pestaña
    // antes de este login, aunque su respuesta llegue después.
    iniciarSesionAlmacenada({ token: data.token, user: data.user });
    await aplicarDatosLogin(data);
  }, [aplicarDatosLogin]);

  useInicializacionMsal({
    onLoggedIn: (data) => {
      if (data?.token && !data.sesionRenovada) {
        // El hook de MSAL ya creó la sesión y marcó el dato para no invalidar
        // la época una segunda vez. Los logins directos sí pasan por aquí.
        if (data.sesionPersistida) aplicarDatosLogin(data);
        else despuesDeLogin(data);
      } else if (data?.user) {
        // renovarSesionConfiable ya persistió la sesión y marcó el resultado.
        // Aquí sólo actualizamos usuario/datos, sin crear otra época de login.
        actualizarUsuario(data.user);
        cargarDatosPosteriores(data.user);
      }
    },
    onLoggedOut: () => {
      limpiarEstadoSesion();
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

  const iniciarSesionOtp = useCallback(async (correo, codigo, nombre, recordarCuenta = false) => {
    try {
      const data = await api.verificarOtp(correo, codigo, nombre, recordarCuenta);
      await despuesDeLogin(data);
      return { ok: true, user: data.user };
    } catch (err) {
      if (errorRequiereNombreOtp(err)) {
        return {
          ok: false,
          requiereNombre: true,
          error: err.message,
          status: err.status,
        };
      }

      return {
        ok: false,
        error: err.message,
        status: err.status,
        reintentarEnSegundos: err.reintentarEnSegundos,
      };
    }
  }, [despuesDeLogin]);

  const cerrarSesion = useCallback(() => {
    revocarCuentaConfiableEnServidor().catch(() => {});
    limpiarCuentaConfiable();
    limpiarEstadoSesion();
    clearSession();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('msal.')) {
        localStorage.removeItem(key);
      }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [limpiarEstadoSesion]);

  const obtenerInscripcionActiva = useCallback(async () => {
    try {
      return await api.getInscripcionActiva();
    } catch {
      return null;
    }
  }, []);

  const idUsuario = idDeUsuario(usuario);
  const obtenerDatosPanel = useCallback(async () => {
    try {
      const inscripcion = await api.getInscripcionActiva();
      if (!inscripcion) return null;
      const club = await api.getClub(inscripcion.id_club);
      const avisos = await api.getAvisos(inscripcion.id_club);
      const esResponsableClub = idUsuario != null
        && Number(club.id_responsable_club) === Number(idUsuario);
      return { club, avisos, esResponsableClub, inscripcion };
    } catch {
      return null;
    }
  }, [idUsuario]);

  const estaAutenticado = !!usuario;
  const esAdmin = usuario?.id_rol === 3 || usuario?.id_rol === 7;
  const esCoordinacion = usuario?.id_rol === 7;
  const esAdminOCoordinacion = esAdmin || esCoordinacion;
  const esResponsableClub = usuario?.id_rol === 2;
  const esLiderClub = usuario?.id_rol === 2 || usuario?.id_rol === 5;
  const esRectoria = usuario?.id_rol === 4;
  // El responsable administra el mural digital y redacta noticias;
  // la aprobación editorial de noticias corresponde a rectoría.
  const esResponsableMural = usuario?.id_rol === 6;
  const puedeGestionarMural = esResponsableMural;
  const puedeGestionarNoticias = esAdmin || esRectoria || esResponsableMural;
  const puedeAprobarNoticias = esRectoria;

  return (
    <ContextoAutenticacion.Provider
      value={{
        usuario, authReady,
        iniciarSesion, iniciarSesionMicrosoft, iniciarSesionOtp, cerrarSesion,
        estaAutenticado, esAdmin, esCoordinacion, esAdminOCoordinacion,
        esResponsableClub, esLiderClub, esRectoria,
        esResponsableMural, puedeGestionarMural, puedeGestionarNoticias, puedeAprobarNoticias,
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
