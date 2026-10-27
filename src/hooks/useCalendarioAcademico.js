import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function useCalendarioAcademico(administracion = false) {
  const [fechas, setFechas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    try {
      const datos = await (administracion ? api.getFechasCalendarioAdmin() : api.getFechasCalendario());
      if (!Array.isArray(datos)) throw new Error('Respuesta de calendario no válida');
      setFechas(datos);
    } catch (err) {
      setErrorCarga(err.status === 404 && administracion
        ? 'El calendario académico aún no está disponible en el servidor.'
        : 'No se pudieron cargar las fechas académicas.');
    } finally { setCargando(false); }
  }, [administracion]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);
  const incorporarFecha = useCallback((fecha) => setFechas((lista) => [fecha, ...lista.filter((item) => item.id_fecha !== fecha.id_fecha)]), []);
  const quitarFecha = useCallback((id) => setFechas((lista) => lista.filter((item) => item.id_fecha !== id)), []);
  return { fechas, cargando, errorCarga, cargar, incorporarFecha, quitarFecha };
}
