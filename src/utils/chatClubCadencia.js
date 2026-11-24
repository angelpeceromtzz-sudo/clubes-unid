// Cadencia compartida entre pestañas para no multiplicar el polling del chat.
// Web Locks hace atómico el leer/reservar la última marca en localStorage. Si el
// navegador no ofrece Locks, el throttle local sigue funcionando en una pestaña.
export function crearEjecutorConCadenciaCompartida({
  clave,
  intervaloMs,
  obtenerAlmacen = () => globalThis.localStorage,
  obtenerLocks = () => globalThis.navigator?.locks,
  ahora = () => Date.now(),
} = {}) {
  let ultimoLocal = null;
  let bloqueadoLocal = 0;
  const claveBloqueo = `${clave}:bloqueado-hasta`;

  async function ejecutarBajoBloque(callback) {
    const almacen = obtenerAlmacen();
    let anterior;
    let bloqueadoHasta = bloqueadoLocal;
    try {
      const crudo = almacen?.getItem(clave);
      const valor = crudo == null ? null : Number(crudo);
      anterior = Number.isFinite(valor) ? valor : ultimoLocal;
      const bloqueo = Number(almacen?.getItem(claveBloqueo) || 0);
      if (Number.isFinite(bloqueo)) bloqueadoHasta = bloqueo;
    } catch {
      anterior = ultimoLocal;
    }

    const actual = ahora();
    if (bloqueadoHasta > actual) return false;
    if (anterior != null && actual - anterior < intervaloMs) return false;

    let marcaEscrita = false;
    ultimoLocal = actual;
    try {
      almacen?.setItem(clave, String(actual));
      marcaEscrita = true;
    } catch {
      // Sin localStorage se mantiene al menos el throttle de esta pestaña.
    }

    try {
      await callback();
      return true;
    } catch (error) {
      // No castigar un reintento legítimo cuando la operación falló.
      ultimoLocal = anterior;
      const reintentarEn = Number(error?.reintentarEnSegundos);
      if (Number.isFinite(reintentarEn) && reintentarEn > 0) {
        bloqueadoLocal = actual + reintentarEn * 1000;
        try {
          almacen?.setItem(claveBloqueo, String(bloqueadoLocal));
        } catch {
          // El cooldown local sigue vigente aunque falle localStorage.
        }
      }
      if (marcaEscrita) {
        try {
          if (almacen.getItem(clave) === String(actual)) {
            if (anterior != null) almacen.setItem(clave, String(anterior));
            else almacen.removeItem(clave);
          }
        } catch {
          // El límite del servidor sigue siendo la barrera autoritativa.
        }
      }
      throw error;
    }
  }

  return async function ejecutarSiToca(callback) {
    const locks = obtenerLocks();
    if (typeof locks?.request === 'function') {
      return locks.request(`unid:chat:cadencia:${clave}`, { mode: 'exclusive' }, () => ejecutarBajoBloque(callback));
    }
    return ejecutarBajoBloque(callback);
  };
}

// Agrupa cambios rápidos de escritura y deja un último envío trailing. Ninguna
// transición typing=false se pierde: se espera como máximo intervaloMs. La
// limpieza activo=false es prioritaria y no espera el throttle de heartbeats.
export function crearCoordinadorPresencia({
  enviar,
  intervaloMs,
  ahora = () => Date.now(),
  programar = (callback, ms) => globalThis.setTimeout(callback, ms),
  cancelar = (id) => globalThis.clearTimeout(id),
} = {}) {
  let ultimoEnvio = null;
  let temporizador = null;
  let enCurso = false;
  let ultimoEstado = null;
  let reprogramar = false;

  function limpiarTemporizador() {
    if (temporizador != null) cancelar(temporizador);
    temporizador = null;
  }

  async function ejecutar(estado) {
    if (enCurso) {
      ultimoEstado = estado;
      reprogramar = true;
      return;
    }

    enCurso = true;
    ultimoEnvio = ahora();
    try {
      await enviar(estado.escribiendo, estado.activo);
    } finally {
      enCurso = false;
      if (reprogramar) {
        reprogramar = false;
        const pendiente = ultimoEstado;
        ultimoEstado = null;
        if (pendiente) programarSegunCadencia(pendiente);
      }
    }
  }

  function programarSegunCadencia(estado) {
    ultimoEstado = estado;
    limpiarTemporizador();

    if (!estado.activo) {
      void ejecutar(estado).catch(() => {});
      return;
    }

    const restante = ultimoEnvio == null ? 0 : intervaloMs - (ahora() - ultimoEnvio);
    if (restante <= 0) {
      void ejecutar(estado).catch(() => {});
      return;
    }

    temporizador = programar(() => {
      temporizador = null;
      void ejecutar(ultimoEstado).catch(() => {});
    }, restante);
  }

  return {
    publicar(escribiendo, activo = true) {
      programarSegunCadencia({ escribiendo: escribiendo === true, activo: activo !== false });
    },
    publicarLatido() {
      // null representa "escribiendo omitido": el backend conserva el TTL.
      programarSegunCadencia({ escribiendo: null, activo: true });
    },
    cancelarPendientes() {
      limpiarTemporizador();
    },
  };
}
