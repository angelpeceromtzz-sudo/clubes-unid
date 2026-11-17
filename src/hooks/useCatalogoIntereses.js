import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function useCatalogoIntereses() {
  const [estado, setEstado] = useState('cargando');
  const [catalogo, setCatalogo] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    api.getCatalogoIntereses()
      .then((datos) => {
        if (!vigente) return;
        setCatalogo(datos);
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const reintentar = useCallback(() => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  }, []);

  return { estado, catalogo, reintentar };
}
