/* Proveedor de noticias: carga la lista pública y controla cuáles ya vio el usuario.
   El estado de lectura se guarda en localStorage como un conjunto de ids vistos,
   de modo que cada noticia mantiene su propio estado "no leída" de forma independiente. */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

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
  const [noticias, setNoticias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [leidas, setLeidas] = useState(leerLeidas);
  const [modal, setModal] = useState(null);
  const [destacada, setDestacada] = useState(null);
  const [actualizacionesAbiertas, setActualizacionesAbiertas] = useState(false);
  // Snapshot de destacadas no leídas al abrir el historial: permite reordenar de
  // forma diferida (estable mientras el modal está abierto, se recalcula al reabrir).
  const [destacadasFijadas, setDestacadasFijadas] = useState(() => new Set());

  const cargar = useCallback(async () => {
    try {
      const data = await api.getNoticias();
      const lista = Array.isArray(data) ? data : [];
      setNoticias(lista);
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
      setNoticias([]);
    } finally {
      setCargando(false);
    }
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
  const abrirActualizaciones = useCallback(() => {
    setDestacadasFijadas(
      new Set(
        noticias.filter((n) => n.destacada && !leidas.has(n.id_noticia)).map((n) => n.id_noticia)
      )
    );
    setActualizacionesAbiertas(true);
  }, [noticias, leidas]);

  const cerrarActualizaciones = useCallback(() => {
    setActualizacionesAbiertas(false);
  }, []);

  const noLeidas = useMemo(
    () => noticias.filter((n) => !leidas.has(n.id_noticia)).length,
    [noticias, leidas]
  );

  // Al terminar la carga inicial, muestra automáticamente el popup si hay noticias sin ver.
  useEffect(() => {
    if (cargando) return;
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
  }, [cargando]);

  return (
    <ContextoNoticias.Provider
      value={{
        noticias,
        cargando,
        noLeidas,
        modal,
        destacada,
        cerrarModal,
        abrirActualizaciones,
        cerrarActualizaciones,
        actualizacionesAbiertas,
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
