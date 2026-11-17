/* Proveedor de noticias: carga la lista privada para usuarios con sesión y
   controla cuáles ya vio el usuario. El estado de lectura se guarda en
   localStorage como un conjunto de ids vistos, de modo que cada noticia
   mantiene su propio estado "no leída" de forma independiente. */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAutenticacion } from './AuthContext';
import { esPublicable, filtrarPublicadas } from '../constants/noticias';

const ContextoNoticias = createContext(null);

const CLAVE_LEIDAS = 'unid_noticias_leidas';
const CLAVE_LEGACY = 'unid_noticias_visto_hasta';

function leerLeidas() {
  try {
    const crudo = localStorage.getItem(CLAVE_LEIDAS);
    if (!crudo) return new Set();
    const ids = JSON.parse(crudo);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function guardarLeidas(leidas) {
  try {
    localStorage.setItem(CLAVE_LEIDAS, JSON.stringify([...leidas]));
  } catch {
    /* localStorage no disponible: el estado de lectura no persistirá */
  }
}

function leerVistoHastaLegacy() {
  try {
    const n = parseInt(localStorage.getItem(CLAVE_LEGACY) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function ProveedorNoticias({ children: hijos }) {
  const { authReady, estaAutenticado } = useAutenticacion();
  const [noticias, setNoticias] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [avisosMural, setAvisosMural] = useState([]);
  const [errorEventos, setErrorEventos] = useState('');
  const [errorMural, setErrorMural] = useState('');
  const [cargando, setCargando] = useState(false);
  const [leidas, setLeidas] = useState(leerLeidas);
  const [modal, setModal] = useState(null);
  const [destacada, setDestacada] = useState(null);
  const [actualizacionesAbiertas, setActualizacionesAbiertas] = useState(false);
  const [filtroActualizaciones, setFiltroActualizaciones] = useState('todos');
  // Snapshot de destacadas no leídas al abrir el historial: permite reordenar de
  // forma diferida (estable mientras el modal está abierto, se recalcula al reabrir).
  const [destacadasFijadas, setDestacadasFijadas] = useState(() => new Set());
  // Identifica la última carga iniciada: al cerrar sesión, una respuesta en
  // vuelo no puede volver a pintar contenido privado.
  const solicitudRef = useRef(0);

  const limpiar = useCallback(() => {
    setNoticias([]);
    setEventos([]);
    setAvisosMural([]);
    setErrorEventos('');
    setErrorMural('');
    setModal(null);
    setDestacada(null);
    setActualizacionesAbiertas(false);
    setDestacadasFijadas(new Set());
    setCargando(false);
  }, []);

  const cargar = useCallback(async () => {
    const solicitud = ++solicitudRef.current;
    if (!authReady || !estaAutenticado) {
      limpiar();
      return;
    }
    setCargando(true);
    try {
      const [respuestaNoticias, respuestaEventos, respuestaMural] = await Promise.allSettled([
        api.getNoticias(),
        api.getEventos(),
        api.getMural(),
      ]);
      if (solicitud !== solicitudRef.current) return;
      // El backend ya sólo devuelve `published`, pero el filtro se repite aquí
      // (red de seguridad y semántica del contexto): fuera de los paneles no
      // puede colarse un borrador, un pendiente ni uno rechazado.
      const lista = filtrarPublicadas(
        respuestaNoticias.status === 'fulfilled' && Array.isArray(respuestaNoticias.value) ? respuestaNoticias.value : []
      );
      setNoticias(lista);
      if (respuestaEventos.status === 'fulfilled' && Array.isArray(respuestaEventos.value)) {
        setEventos(filtrarPublicadas(respuestaEventos.value));
        setErrorEventos('');
      } else {
        setEventos([]);
        setErrorEventos('No se pudieron cargar los eventos del campus.');
      }
      if (respuestaMural.status === 'fulfilled' && Array.isArray(respuestaMural.value)) {
        setAvisosMural(filtrarPublicadas(respuestaMural.value));
        setErrorMural('');
      } else {
        setAvisosMural([]);
        setErrorMural('No se pudieron cargar los avisos del mural.');
      }
      // Migración del esquema antiguo (umbral "visto hasta") al conjunto de ids.
      const legacy = leerVistoHastaLegacy();
      if (legacy > 0) {
        setLeidas((prev) => {
          const siguiente = new Set(prev);
          lista.forEach((n) => {
            if (n.id_noticia <= legacy) siguiente.add(n.id_noticia);
          });
          guardarLeidas(siguiente);
          return siguiente;
        });
        try {
          localStorage.removeItem(CLAVE_LEGACY);
        } catch {
          /* ignorar */
        }
      }
    } catch {
      if (solicitud !== solicitudRef.current) return;
      limpiar();
    } finally {
      if (solicitud === solicitudRef.current) setCargando(false);
    }
  }, [authReady, estaAutenticado, limpiar]);

  const actualizarPublicacion = useCallback((publicacion) => {
    const actualizarLista = (lista, incluir) => {
      const otras = lista.filter((item) => item.id_noticia !== publicacion.id_noticia);
      return incluir && esPublicable(publicacion) ? [publicacion, ...otras] : otras;
    };
    setNoticias((lista) => actualizarLista(lista, true));
    setEventos((lista) => actualizarLista(lista, publicacion.categoria === 'evento'));
    setAvisosMural((lista) => actualizarLista(lista, publicacion.mostrar_en_mural));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const esLeida = useCallback((id) => leidas.has(id), [leidas]);

  const marcarLeida = useCallback((id) => {
    setLeidas((prev) => {
      if (prev.has(id)) return prev;
      const siguiente = new Set(prev);
      siguiente.add(id);
      guardarLeidas(siguiente);
      return siguiente;
    });
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setLeidas((prev) => {
      const siguiente = new Set(prev);
      noticias.forEach((n) => siguiente.add(n.id_noticia));
      guardarLeidas(siguiente);
      return siguiente;
    });
  }, [noticias]);

  // El popup se descarta marcando como vista la noticia mostrada.
  const cerrarModal = useCallback(() => {
    if (modal === 'destacada' && destacada) marcarLeida(destacada.id_noticia);
    setModal(null);
    setDestacada(null);
  }, [modal, destacada, marcarLeida]);

  // Al abrir el historial, fija las destacadas no leídas para mostrarlas arriba.
  const abrirActualizaciones = useCallback((filtro) => {
    if (!estaAutenticado) return;
    setFiltroActualizaciones(filtro === 'evento' ? 'evento' : 'todos');
    setDestacadasFijadas(
      new Set(
        noticias.filter((n) => n.destacada && !leidas.has(n.id_noticia)).map((n) => n.id_noticia)
      )
    );
    setActualizacionesAbiertas(true);
  }, [estaAutenticado, noticias, leidas]);

  const cerrarActualizaciones = useCallback(() => {
    setActualizacionesAbiertas(false);
  }, []);

  const noLeidas = useMemo(
    () => noticias.filter((n) => !leidas.has(n.id_noticia)).length,
    [noticias, leidas]
  );

  // Al terminar la carga inicial, muestra automáticamente el popup si hay
  // noticias sin ver. Invitados nunca reciben el popup.
  useEffect(() => {
    if (!estaAutenticado || cargando) return;
    let cancelado = false;
    const noLeidasLista = noticias.filter((n) => !leidas.has(n.id_noticia));
    // Prioriza la destacada no leída más reciente; si no hay, la no leída más reciente.
    const pendiente = noLeidasLista.find((n) => n.destacada) ?? noLeidasLista[0];
    if (pendiente && !cancelado) {
      setTimeout(() => {
        if (!cancelado) {
          setDestacada((prev) => prev ?? pendiente);
          setModal((prev) => prev ?? 'destacada');
        }
      }, 0);
    }
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estaAutenticado, cargando]);

  return (
    <ContextoNoticias.Provider
      value={{
        noticias,
        eventos,
        avisosMural,
        errorEventos,
        errorMural,
        actualizarPublicacion,
        cargando,
        noLeidas,
        modal,
        destacada,
        cerrarModal,
        abrirActualizaciones,
        cerrarActualizaciones,
        actualizacionesAbiertas,
        filtroActualizaciones,
        setFiltroActualizaciones,
        destacadasFijadas,
        marcarLeida,
        marcarTodasLeidas,
        estaLeida: esLeida,
        refetch: cargar,
      }}
    >
      {hijos}
    </ContextoNoticias.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNoticias() {
  const ctx = useContext(ContextoNoticias);
  if (!ctx) throw new Error('useNoticias debe usarse dentro de ProveedorNoticias');
  return ctx;
}
