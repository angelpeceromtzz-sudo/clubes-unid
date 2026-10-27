import { useCallback, useEffect, useState } from 'react';
import { muralService } from '../services/mural.service';

export function useMural(administracion = false) {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await muralService.listar(administracion);
      if (!Array.isArray(lista)) throw new Error('Respuesta del mural no válida');
      setPublicaciones(lista.map((item) => ({ ...item, origen: 'mural', mostrar_en_mural: true })));
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }, [administracion]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);
  const incorporar = useCallback((item) => setPublicaciones((lista) => [{ ...item, origen: 'mural', mostrar_en_mural: true }, ...lista.filter((otra) => otra.id_publicacion !== item.id_publicacion)]), []);
  const quitar = useCallback((id) => setPublicaciones((lista) => lista.filter((item) => item.id_publicacion !== id)), []);
  return { publicaciones, cargando, error, cargar, incorporar, quitar };
}
