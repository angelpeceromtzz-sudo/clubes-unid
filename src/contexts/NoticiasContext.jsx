/* Proveedor de noticias: carga la lista pública y controla cuáles ya vio el usuario.
   El estado de lectura se guarda en localStorage con el id de la última noticia vista,
   ya que los ids de la tabla son autoincrementales. */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

const ContextoNoticias = createContext(null);

const CLAVE_VISTAS = 'unid_noticias_visto_hasta';

function leerVistoHasta() {
  try {
    const n = parseInt(localStorage.getItem(CLAVE_VISTAS) || '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function guardarVistoHasta(id) {
  try {
    localStorage.setItem(CLAVE_VISTAS, String(id));
  } catch {
    /* localStorage no disponible: el contador simplemente no persistirá */
  }
}

export function ProveedorNoticias({ children: hijos }) {
  const [noticias, setNoticias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistoHasta, setVistoHasta] = useState(leerVistoHasta);
  const [modal, setModal] = useState(null);
  const [destacada, setDestacada] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api.getNoticias();
      setNoticias(Array.isArray(data) ? data : []);
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

  const avanzar = useCallback((id) => {
    setVistoHasta((prev) => {
      const nuevo = Math.max(prev, id);
      guardarVistoHasta(nuevo);
      return nuevo;
    });
  }, []);

  const marcarLeida = useCallback((id) => avanzar(id), [avanzar]);

  const marcarTodasLeidas = useCallback(() => {
    const maxId = noticias.reduce((max, n) => Math.max(max, n.id_noticia), 0);
    if (maxId > 0) avanzar(maxId);
  }, [noticias, avanzar]);

  // El popup se descarta marcando como vista la noticia mostrada.
  const cerrarModal = useCallback(() => {
    if (modal === 'destacada' && destacada) marcarLeida(destacada.id_noticia);
    setModal(null);
    setDestacada(null);
  }, [modal, destacada, marcarLeida]);

  const noLeidas = useMemo(
    () => noticias.filter((n) => n.id_noticia > vistoHasta).length,
    [noticias, vistoHasta]
  );

  // Al terminar la carga inicial, muestra automáticamente el popup si hay noticias sin ver.
  useEffect(() => {
    if (cargando) return;
    let cancelado = false;
    const pendiente = noticias.find((n) => n.id_noticia > vistoHasta);
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
        marcarLeida,
        marcarTodasLeidas,
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
