import { useState, useEffect, useCallback } from 'react';

export function useTutorial(id) {
  const storageKey = id ? `tutorial_${id}_done` : null;
  const [activo, setActivo] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (!storageKey) return;
    try {
      if (localStorage.getItem(storageKey) === 'true') return;
    } catch { /* ignore */ }
  }, [storageKey]);

  const iniciar = useCallback(() => {
    setPaso(0);
    setActivo(true);
  }, []);

  const siguiente = useCallback((total) => {
    if (paso + 1 >= total) {
      if (storageKey) {
        try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
      }
      setActivo(false);
      setPaso(0);
      return;
    }
    setPaso((p) => p + 1);
  }, [paso, storageKey]);

  const saltar = useCallback(() => {
    if (storageKey) {
      try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
    }
    setActivo(false);
    setPaso(0);
  }, [storageKey]);

  const reintentar = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    iniciar();
  }, [storageKey, iniciar]);

  return { activo, paso, iniciar, siguiente, saltar, reintentar };
}