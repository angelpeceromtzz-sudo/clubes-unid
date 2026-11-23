import { errorActividad, textoActividad } from './actividadesDominio.js';

export function normalizarCartaTrineo(datos = {}) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw errorActividad('Completa los datos de la carta');
  const nombre = textoActividad(datos.nombre, 150, 'Nombre del niño', true);
  const deseo = textoActividad(datos.deseo, 2000, 'Deseo', true);
  let edad;
  if (datos.edad !== undefined) {
    edad = typeof datos.edad === 'number' || typeof datos.edad === 'string' && datos.edad.trim() !== '' ? Number(datos.edad) : NaN;
  } else if (datos.edad_meses !== undefined) {
    const meses = typeof datos.edad_meses === 'number' || typeof datos.edad_meses === 'string' && datos.edad_meses.trim() !== '' ? Number(datos.edad_meses) : NaN;
    edad = Number.isInteger(meses) && meses >= 1 && meses <= 1200 ? Math.floor(meses / 12) : NaN;
  } else {
    // Compatibilidad con clientes y cartas de la migración anterior.
    edad = NaN;
  }
  if (!Number.isInteger(edad) || edad < 0 || edad > 100) throw errorActividad('Indica una edad entera entre 0 y 100 años');
  if (datos.activa !== undefined && typeof datos.activa !== 'boolean') throw errorActividad('Indica si la carta está disponible');
  return { nombre, edad, deseo, activa: datos.activa ?? true };
}

export function validarSeleccionCartaTrineo({ plantilla, idCarta, actual, anteriorConfirmado, cartaObligatoria = true }) {
  const seleccion = idCarta === undefined ? actual?.id_carta ?? null : idCarta;
  if (plantilla !== 'trineo') {
    if (seleccion != null) throw errorActividad('Las cartas de regalo corresponden únicamente a Trineo');
    return null;
  }
  // Los registros históricos siguen siendo consultables y editables sin inventar una carta.
  if (seleccion == null && anteriorConfirmado && !actual) return null;
  if (seleccion == null && !cartaObligatoria) return null;
  if (!['number', 'string'].includes(typeof seleccion) || !/^[1-9]\d*$/.test(String(seleccion)) || !Number.isSafeInteger(Number(seleccion))) throw errorActividad('Elige al niño de tu carta antes de confirmar tu inscripción');
  const id = Number(seleccion);
  if ((actual?.recibida || actual?.recibida_en) && actual.id_carta !== id) throw errorActividad('Un regalo recibido conserva su carta', 409);
  return id;
}
