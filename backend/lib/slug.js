// Generación de slugs para el enlace público de las encuestas.
//
// El slug ES la credencial de la encuesta: quien lo tiene puede responder, y no
// hay login detrás (ver el bloque del módulo de encuestas en schema.sql). Por
// eso tiene que ser aleatorio y no adivinable, no algo tipo 'encuesta-1'.
import { randomBytes } from 'crypto';

// Sin vocales ni 0/1/O/L. Motivo: el enlace se dicta por teléfono o se pega en
// un chat, y 'a' vs 'e' no se distingue de oído. También quita las únicas
// combinaciones que se confunden al leerlas en mayúsculas (l/1/I, 0/O).
const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789';
const LONGITUD_DEFAULT = 22;

/**
 * Genera un slug aleatorio que cumple ^[a-z0-9-]{16,64}$ (chk_encuesta_slug).
 *
 * 22 caracteres × 5 bits = 110 bits de entropía. El mapeo byte -> letra es
 * uniforme porque 256 es múltiplo exacto de 32 (el tamaño del alfabeto): no hay
 * sesgo modulo, que sí lo habría con un alfabeto de tamaño no potencia de dos.
 *
 * @param {number} longitud Caracteres a generar. Mínimo 16 (lo exige el CHECK).
 * @returns {string}
 */
export function generarSlug(longitud = LONGITUD_DEFAULT) {
  if (longitud < 16) {
    throw new Error(`generarSlug: la longitud mínima es 16 (recibido ${longitud})`);
  }

  const bytes = randomBytes(longitud);
  let slug = '';

  for (let i = 0; i < longitud; i++) {
    slug += ALFABETO[bytes[i] % ALFABETO.length];
  }

  return slug;
}

const INTENTOS_MAXIMOS = 5;

/**
 * Genera un slug y confirma que esté libre antes de devolverlo.
 *
 * El slug es UNIQUE en la base, así que el INSERT puede chocar aunque el slug sea
 * criptográficamente único (colisión real o, más probablemente, un slug que
 * alguien ya usó a propósito). Se reintenta en vez de dejar que reviente un 23505.
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<string>}
 */
export async function generarSlugLibre(pool) {
  for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
    const slug = generarSlug();

    const existe = await pool.query('SELECT 1 FROM encuestas WHERE slug = $1', [slug]);

    if (existe.rowCount === 0) {
      return slug;
    }
  }

  throw new Error('No se pudo generar un slug libre tras varios intentos');
}