// Carga el detalle de UNA encuesta para la vista previa.
//
// Existe aparte de `useSeccionEncuestas` porque la vista previa se abre sobre una
// encuesta distinta a la que esté editándose, y el detalle del editor no se puede
// reusar sin arrastrar también el formulario y la lista de preguntas.
//
// No recibe el feedback del panel a propósito: la vista previa es un modal y sus
// errores se muestran dentro del modal. Si un fallo se mandara al feedback del
// panel, aparecería detrás del overlay y no se vería.
import { useCallback, useEffect, useRef, useState } from 'react';
import { encuestaService } from '../services/encuesta.service';

export function useDetalleEncuesta(idEncuesta) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // El ref, no un flag por render, porque la promesa puede resolverse después de
  // cerrar el modal. Sin esta guarda el setState cae sobre un componente ya
  // desmontado.
  const vigente = useRef(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const dato = await encuestaService.obtener(idEncuesta);
      if (vigente.current) setDetalle(dato);
    } catch (err) {
      if (vigente.current) setError(err.message);
    } finally {
      if (vigente.current) setCargando(false);
    }
  }, [idEncuesta]);

  useEffect(() => {
    vigente.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();

    return () => {
      vigente.current = false;
    };
  }, [cargar]);

  return { detalle, cargando, error, recargar: cargar };
}