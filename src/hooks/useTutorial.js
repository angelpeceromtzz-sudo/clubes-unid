import { useState, useEffect, useCallback } from 'react';

export function useTutorial(id) {
  const storageKey = `tutorial_${id}_done`;
  const [activo, setActivo] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === 'true') return;
    } catch { /* ignore */ }
  }, [storageKey]);

  const iniciar = useCallback(() => {
    setPaso(0);
    setActivo(true);
  }, []);

  const siguiente = useCallback((total) => {
    setPaso((p) => {
      if (p + 1 >= total) {
        try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
        setActivo(false);
        return 0;
      }
      return p + 1;
    });
  }, [storageKey]);

  const saltar = useCallback(() => {
    try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
    setActivo(false);
    setPaso(0);
  }, [storageKey]);

  const reintentar = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    iniciar();
  }, [storageKey, iniciar]);

  return { activo, paso, iniciar, siguiente, saltar, reintentar };
}