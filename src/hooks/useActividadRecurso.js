import { useCallback, useEffect, useState } from 'react';
import { request } from '../services/api-core';

// La identidad forma parte de la clave para no reutilizar datos de otra sesión.
export function useActividadRecurso(ruta, identidad = 'publico', refrescar = false) {
  const [version, setVersion] = useState(0);
  const clave = String(identidad) + ':' + ruta + ':' + version;
  const [estado, setEstado] = useState({ clave: null, datos: null, error: '' });
  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);
  useEffect(() => {
    if (!ruta) return;
    let activo = true;
    const cargar = () => request('/actividades' + ruta).then((datos) => {
      if (activo) setEstado({ clave, datos, error: '' });
    }).catch((error) => {
      if (activo) setEstado({ clave, datos: null, error: error.mensajeServidor || error.message });
    });
    cargar();
    const intervalo = refrescar ? window.setInterval(cargar, 60000) : null;
    const alVolver = () => { if (!document.hidden) cargar(); };
    if (refrescar) document.addEventListener('visibilitychange', alVolver);
    if (refrescar) window.addEventListener('focus', alVolver);
    return () => { activo = false; if (intervalo) window.clearInterval(intervalo); document.removeEventListener('visibilitychange', alVolver); window.removeEventListener('focus', alVolver); };
  }, [ruta, clave, refrescar]);
  const vigente = estado.clave === clave;
  return { datos: vigente ? estado.datos : null, error: vigente ? estado.error : '', cargando: Boolean(ruta && !vigente), recargar };
}
