import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export function useCalendarioAcademico(administracion = false, habilitado = true) {
  const [fechas, setFechas] = useState([]);
  const [cargando, setCargando] = useState(habilitado);
  const [errorCarga, setErrorCarga] = useState('');
  const solicitudRef = useRef(0);
  const cargar = useCallback(async () => {
    const solicitud = ++solicitudRef.current;
    if (!habilitado) {
      setFechas([]);
      setErrorCarga('');
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrorCarga('');
    try {
      const datos = await (administracion ? api.getFechasCalendarioAdmin() : api.getFechasCalendario());
      if (solicitud !== solicitudRef.current) return;
      if (!Array.isArray(datos)) throw new Error('Respuesta de calendario no válida');
      setFechas(datos);
    } catch (err) {
      if (solicitud !== solicitudRef.current) return;
      if (err.status === 401) {
        setFechas([]);
        setErrorCarga('');
        return;
      }
      setErrorCarga(err.status === 404 && administracion
        ? 'El calendario académico aún no está disponible en el servidor.'
        : 'No se pudieron cargar las fechas académicas.');
    } finally {
      if (solicitud === solicitudRef.current) setCargando(false);
    }
  }, [administracion, habilitado]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);
  const incorporarFecha = useCallback((fecha) => setFechas((lista) => [fecha, ...lista.filter((item) => item.id_fecha !== fecha.id_fecha)]), []);
  const quitarFecha = useCallback((id) => setFechas((lista) => lista.filter((item) => item.id_fecha !== id)), []);
  return { fechas, cargando, errorCarga, cargar, incorporarFecha, quitarFecha };
}
