import { useState, useEffect, useCallback } from 'react';
import { catalogoService } from '../services/encuesta.service';

// Catálogo de licenciaturas.
//
// Cachea en el módulo, no en el estado del componente: la encuesta pública y el
// formulario de inscripción son pantallas distintas que piden lo mismo, y sin
// este cache cada montaje dispararía otro GET. El backend además cachea 10
// minutos, así que una segunda llamada durante la sesión ni sale a la red.
let cache = null;
let promesaEnVuelo = null;

function obtener() {
  if (cache) return Promise.resolve(cache);

  // Dos montajes simultáneos (p. ej. el selector y el aviso del formulario)
  // comparten la misma promesa en vez de duplicar el request.
  if (!promesaEnVuelo) {
    promesaEnVuelo = catalogoService.getLicenciaturas()
      .then((filas) => {
        cache = Array.isArray(filas) ? filas : [];
        return cache;
      })
      .finally(() => {
        promesaEnVuelo = null;
      });
  }

  return promesaEnVuelo;
}

export function useLicenciaturas() {
  const [licenciaturas, setLicenciaturas] = useState(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    // `cancelado` evita el aviso de "setState en componente desmontado" cuando
    // el alumno navega fuera antes de que resuelva la petición.
    let cancelado = false;

    obtener()
      .then((filas) => {
        if (cancelado) return;
        setLicenciaturas(filas);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err);
        setLicenciaturas([]);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Reintento manual tras un fallo. Es un click del usuario, no un efecto, así
  // que aquí sí se puede poner loading sin problema.
  const recargar = useCallback(async () => {
    cache = null;
    setLoading(true);
    setError(null);
    try {
      const filas = await obtener();
      setLicenciaturas(filas);
      return filas;
    } catch (err) {
      setError(err);
      setLicenciaturas([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Descarta el cache del módulo. Lo usa el panel tras dar de alta un programa
  // para que el <select> no se quede con la lista anterior.
  const invalidar = useCallback(() => {
    cache = null;
  }, []);

  // Invalida el catálogo de los dos lados: el del módulo y el del backend.
  //
  // El local solo no alcanza. El backend cachea 10 minutos y `obtener()` pide
  // `/catalogos/licenciaturas`, así que olvidar ese caché dejaría el <select>
  // sirviendo la lista vieja aunque este módulo ya la haya olvidado, que es
  // justo el síntoma que la invalidación viene a evitar.
  //
  // Se limpia lo local antes de la llamada porque es instantáneo y no depende de
  // la red. Si la remota falla, el error se devuelve en vez de tragárselo: el
  // caché del backend se vence solo, así que un fallo aquí degrada la frescura
  // del catálogo, no la exactitud de lo ya mostrado.
  //
  // @returns {Promise<{ok: boolean, error: Error|null}>}
  const invalidarRemoto = useCallback(async () => {
    cache = null;

    try {
      await catalogoService.invalidarLicenciaturas();
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err };
    }
  }, []);

  return { licenciaturas, loading, error, recargar, invalidar, invalidarRemoto };
}
